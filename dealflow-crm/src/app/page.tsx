import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { MarketingLanding } from "@/components/marketing-landing";
import { authOptions } from "@/lib/auth-options";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/dashboard");
  return <MarketingLanding />;
}
