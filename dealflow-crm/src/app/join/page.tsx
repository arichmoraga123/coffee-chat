import { prisma } from "@/lib/prisma";
import { MarketingLanding } from "@/components/marketing-landing";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const params = await searchParams;
  const code = String(params.ref ?? "").trim().toUpperCase();
  let inviteName: string | null = null;
  if (code) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { name: true } });
    inviteName = referrer?.name ?? null;
  }
  return <MarketingLanding inviteName={inviteName} />;
}
