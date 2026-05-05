import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";
import { estimateAnthropicCostUsd } from "@/lib/anthropic";

export async function GET() {
  await requireAdminUserId();
  const rows = await prisma.apiUsageLog.findMany({
    select: { feature: true, inputTokens: true, outputTokens: true },
  });
  let inT = 0;
  let outT = 0;
  const byFeature: Record<string, { calls: number; in: number; out: number }> = {};
  for (const r of rows) {
    inT += r.inputTokens;
    outT += r.outputTokens;
    if (!byFeature[r.feature]) byFeature[r.feature] = { calls: 0, in: 0, out: 0 };
    byFeature[r.feature].calls++;
    byFeature[r.feature].in += r.inputTokens;
    byFeature[r.feature].out += r.outputTokens;
  }
  const totalCalls = rows.length;
  const estimatedCostUsd = estimateAnthropicCostUsd(inT, outT);
  const featureBreakdown = Object.entries(byFeature).map(([feature, v]) => ({
    feature,
    calls: v.calls,
    inputTokens: v.in,
    outputTokens: v.out,
    estCostUsd: estimateAnthropicCostUsd(v.in, v.out),
  }));

  return NextResponse.json({
    totalCalls,
    inputTokens: inT,
    outputTokens: outT,
    estimatedCostUsd,
    featureBreakdown,
  });
}
