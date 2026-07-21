import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { lookupKnownFirmType } from "@/lib/known-firms";
import {
  mapRowToContact,
  parseServerSpreadsheet,
  type ImportField,
} from "@/lib/contact-import";
import { RecruitingCategory, ReferralProbability } from "@prisma/client";
import { randomBytes } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function placeholderEmail(): string {
  return `import+${randomBytes(8).toString("hex")}@placeholder.local`;
}

function firmTypeToCategory(type: string | null): RecruitingCategory {
  if (type === "PE") return "PE";
  if (type === "GE") return "GE";
  if (type === "VC") return "VC";
  if (type === "HF") return "HF";
  return "IB";
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const mappingRaw = form.get("mapping");
  const skipDuplicates = form.get("skipDuplicates") !== "false";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
  }

  let mapping: Record<number, ImportField>;
  try {
    mapping = JSON.parse(String(mappingRaw ?? "{}")) as Record<number, ImportField>;
  } catch {
    return NextResponse.json({ error: "Invalid mapping JSON." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseServerSpreadsheet(buffer, file.name);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importedIds: string[] = [];

  const existingContacts = await prisma.contact.findMany({
    where: { userId },
    select: { id: true, email: true, fullName: true, firmId: true },
  });
  const existingFirms = await prisma.firm.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const firmByName = new Map(existingFirms.map((f) => [f.name.toLowerCase(), f.id]));

  for (let i = 0; i < parsed.rows.length; i++) {
    const rowNum = i + 2;
    const mapped = mapRowToContact(parsed.rows[i], mapping);
    if (!mapped) {
      errors.push(`Row ${rowNum}: missing required name`);
      continue;
    }

    const email = mapped.email.trim() || placeholderEmail();
    const firmKey = mapped.firm.toLowerCase();
    let firmId = firmByName.get(firmKey);

    if (!firmId) {
      const knownType = lookupKnownFirmType(mapped.firm);
      const created = await prisma.firm.create({
        data: {
          name: mapped.firm,
          type: knownType,
          location: mapped.location || "Unknown",
          focus: "Generalist",
          userId,
        },
        select: { id: true },
      });
      firmId = created.id;
      firmByName.set(firmKey, firmId);
    }

    if (skipDuplicates) {
      const dupByEmail =
        mapped.email &&
        existingContacts.some(
          (c) => c.email.toLowerCase() === mapped.email.toLowerCase(),
        );
      const dupByNameFirm = existingContacts.some(
        (c) =>
          c.fullName.toLowerCase() === mapped.fullName.toLowerCase() &&
          c.firmId === firmId,
      );
      if (dupByEmail || dupByNameFirm) {
        skipped++;
        continue;
      }
    }

    try {
      const contact = await prisma.contact.create({
        data: {
          fullName: mapped.fullName,
          email,
          phone: mapped.phone,
          linkedinUrl: mapped.linkedinUrl,
          firmId,
          group: "",
          title: mapped.title,
          location: mapped.location || "Unknown",
          school: "",
          recruitingCategory: firmTypeToCategory(
            lookupKnownFirmType(mapped.firm),
          ),
          relationshipStrength: 1,
          referralProbability: ReferralProbability.MEDIUM,
          notes: mapped.notes,
          lastInteractionDate: null,
          userId,
          source: "import",
          warmthScore: "COLD",
        },
        select: { id: true, email: true, fullName: true, firmId: true },
      });
      existingContacts.push(contact);
      importedIds.push(contact.id);
      imported++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      errors.push(`Row ${rowNum}: ${msg}`);
    }
  }

  return NextResponse.json({ imported, skipped, errors, importedIds });
}
