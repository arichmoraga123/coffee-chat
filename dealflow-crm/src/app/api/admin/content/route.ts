import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

export async function GET() {
  await requireAdminUserId();
  const [pendingQuestions, pendingMock, pendingVault, reports, templates] = await Promise.all([
    prisma.question.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        question: true,
        category: true,
        difficulty: true,
        submittedById: true,
        createdAt: true,
      },
    }),
    prisma.mockInterviewQuestion.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        question: true,
        bankSource: true,
        category: true,
        submittedById: true,
        createdAt: true,
      },
    }),
    prisma.vaultDocument.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.contentReport.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.emailTemplate.findMany({
      orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  return NextResponse.json({
    pendingQuestions,
    pendingMock,
    pendingVault,
    reports,
    templates,
  });
}
