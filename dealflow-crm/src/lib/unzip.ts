import { inflateRawSync } from "node:zlib";

/** Minimal .zip reader (stored + deflate entries) using the central directory. Enough for uploaded workbook bundles. */
export function unzip(buf: Buffer, opts: { maxEntries?: number; maxTotalBytes?: number } = {}): { name: string; data: Buffer }[] {
  const maxEntries = opts.maxEntries ?? 200;
  const maxTotal = opts.maxTotalBytes ?? 200 * 1024 * 1024;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count > maxEntries) throw new Error("Too many files in the zip");
  const out: { name: string; data: Buffer }[] = [];
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt zip");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    total += size;
    if (total > maxTotal) throw new Error("Zip is too large once unpacked");
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    const data = method === 0 ? Buffer.from(raw) : method === 8 ? inflateRawSync(raw, { maxOutputLength: Math.max(size, 1) + 1024 }) : null;
    if (!data) throw new Error(`Unsupported compression in ${name}`);
    out.push({ name, data });
  }
  return out;
}
