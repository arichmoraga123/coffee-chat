import { requireUserId } from "@/lib/auth";
import { CompSubmitForm } from "./comp-submit-form";

export const dynamic = "force-dynamic";

export default async function CompSubmitPage() {
  await requireUserId();
  return <CompSubmitForm />;
}
