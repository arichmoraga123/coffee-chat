import { requireUserId } from "@/lib/auth";
import { MockInterviewView } from "@/components/mock-interview-view";

export const dynamic = "force-dynamic";

export default async function MockInterviewPage() {
  await requireUserId();
  return <MockInterviewView />;
}
