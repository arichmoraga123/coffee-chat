import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { CompDataExplorer } from "@/components/comp-data-explorer";

export const dynamic = "force-dynamic";

export default async function CompPage() {
  const session = await getServerSession(authOptions);
  return <CompDataExplorer loggedIn={Boolean(session?.user?.id)} />;
}
