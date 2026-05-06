import { ClubSubnav } from "@/components/club-subnav";

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <ClubSubnav />
      {children}
    </div>
  );
}
