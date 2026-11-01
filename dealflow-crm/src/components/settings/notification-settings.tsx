"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_LABEL, type PrefCategory } from "@/lib/notification-kinds";

type Prefs = {
  email: boolean;
  sms: boolean;
  phone: string | null;
  phoneVerified: boolean;
  timezone: string;
  quietStart: number;
  quietEnd: number;
  smsAvailable: boolean;
  emailAvailable: boolean;
} & Record<PrefCategory, boolean>;

const CONSENT = "I agree to receive follow-up and club reminder texts from Prospect. Msg & data rates may apply. Reply STOP to opt out.";
const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Asia/Hong_Kong", "Asia/Kolkata"];
const HOURS = Array.from({ length: 24 }, (_, h) => ({ v: h, l: new Date(Date.UTC(2026, 0, 1, h)).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" }) }));
const CATEGORY_HELP: Record<PrefCategory, string> = {
  followupDigest: "Each morning, only when follow-ups are due",
  mentorAlerts: "Questions for mentors, and answers to yours",
  clubPosts: "New assignments, resources and announcements",
  eventReminders: "The day of events you RSVP'd to",
  challenges: "Challenge invites and results",
  messages: "New direct messages",
};

function Toggle({ checked, onChange, label, help, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string; disabled?: boolean }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2.5">
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {help ? <span className="block text-[13px] text-ink-3">{help}</span> : null}
      </span>
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function NotificationSettings() {
  const [p, setP] = useState<Prefs | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/notifications/prefs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Prefs | null) => {
        if (!d) return;
        setP(d);
        setPhone(d.phone ?? "");
      });
  }, []);

  const save = async (patch: Partial<Prefs>) => {
    if (!p) return;
    setP({ ...p, ...patch });
    const res = await fetch("/api/notifications/prefs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) {
      toast.error("Couldn't save.");
      return;
    }
    setP((await res.json()) as Prefs);
  };

  const phoneAction = async (action: "send" | "verify" | "off") => {
    setBusy(true);
    const res = await fetch("/api/notifications/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, phone, code, consent }) });
    setBusy(false);
    const d = (await res.json().catch(() => ({}))) as { error?: string; phone?: string };
    if (!res.ok) return toast.error(d.error ?? "That didn't work.");
    if (action === "send") {
      setCodeSent(true);
      toast("Code sent");
    } else if (action === "verify") {
      setCodeSent(false);
      setCode("");
      toast("Texts are on");
      setP((x) => (x ? { ...x, sms: true, phone: d.phone ?? x.phone, phoneVerified: true } : x));
    } else {
      toast("Texts are off");
      setP((x) => (x ? { ...x, sms: false } : x));
    }
  };

  if (!p) return <p className="text-sm text-ink-3">Loading…</p>;

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">Email</p>
        <Toggle checked={p.email} onChange={(v) => void save({ email: v })} label="Email me" help={p.emailAvailable ? "Sent to your account email. Every email has an unsubscribe link." : "Email sending isn't set up on this server yet."} />
      </div>

      <div>
        <p className="eyebrow mb-1">What to send</p>
        <p className="mb-1 text-[13px] text-ink-3">These control email and texts. Everything still shows in the bell.</p>
        <div className="divide-y divide-divider">
          {(Object.keys(CATEGORY_LABEL) as PrefCategory[]).map((c) => (
            <Toggle key={c} checked={p[c]} onChange={(v) => void save({ [c]: v } as Partial<Prefs>)} label={CATEGORY_LABEL[c]} help={CATEGORY_HELP[c]} />
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-2">Text messages</p>
        {!p.smsAvailable ? (
          <p className="text-[13px] text-ink-3">Texts aren&apos;t turned on yet. Once they are, you can get the morning digest and event reminders by text. At most 2 texts a day.</p>
        ) : p.sms && p.phoneVerified ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink">
              Texting {p.phone}. <span className="text-ink-3">At most 2 a day, never during quiet hours.</span>
            </p>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void phoneAction("off")}>
              Turn off texts
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-3">Text me the morning digest, mentor alerts (mentors only) and day-of event reminders. At most 2 texts a day.</p>
            <div className="flex flex-wrap gap-2">
              <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="(517) 555-0134" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-48" aria-label="Mobile number" />
              <Button size="sm" variant="secondary" className="h-9" disabled={busy || !phone.trim()} onClick={() => void phoneAction("send")}>
                {codeSent ? "Resend code" : "Send code"}
              </Button>
            </div>
            {codeSent ? (
              <div className="space-y-3">
                <Input inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} className="w-48" aria-label="Verification code" />
                <label className="flex items-start gap-2 text-[13px] text-ink-2">
                  <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>{CONSENT}</span>
                </label>
                <Button size="sm" variant="primary" disabled={busy || !code.trim() || !consent} onClick={() => void phoneAction("verify")}>
                  Verify and turn on texts
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink-2">Time zone</label>
          <Select value={p.timezone} onChange={(e) => void save({ timezone: e.target.value })} aria-label="Time zone">
            {(ZONES.includes(p.timezone) ? ZONES : [p.timezone, ...ZONES]).map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ").replace("America/", "").replace("Pacific/", "").replace("Europe/", "").replace("Asia/", "")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink-2">Quiet from</label>
          <Select value={String(p.quietStart)} onChange={(e) => void save({ quietStart: Number(e.target.value) })} aria-label="Quiet hours start">
            {HOURS.map((h) => (
              <option key={h.v} value={String(h.v)}>
                {h.l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink-2">Until</label>
          <Select value={String(p.quietEnd)} onChange={(e) => void save({ quietEnd: Number(e.target.value) })} aria-label="Quiet hours end">
            {HOURS.map((h) => (
              <option key={h.v} value={String(h.v)}>
                {h.l}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
