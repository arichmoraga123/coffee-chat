import { Tabs } from "@/components/ui/tabs";

export type ContactsTabKey = "active" | "network" | "queue" | "trash" | "imports";

export function ContactsTabs({ active, counts }: { active: ContactsTabKey; counts?: Partial<Record<ContactsTabKey, number>> }) {
  const label = (k: ContactsTabKey, l: string) => (counts?.[k] !== undefined ? `${l} (${counts[k]})` : l);
  return (
    <Tabs
      items={[
        { href: "/contacts", label: label("active", "Contacts"), active: active === "active" },
        { href: "/contacts?view=network", label: label("network", "Network"), active: active === "network" },
        { href: "/contacts?view=queue", label: "Outreach queue", active: active === "queue" },
        { href: "/contacts/trash", label: label("trash", "Trash"), active: active === "trash" },
        { href: "/contacts/imports", label: "Imports", active: active === "imports" },
      ]}
    />
  );
}
