"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const chartTooltip = {
  contentStyle: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--ink)",
  },
};

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastActiveAt: string | null;
  updatedAt: string;
  drillStreak: number;
  xp: number;
  accountActive: boolean;
  questionsMastered: number;
  contactsAdded: number;
  pipelineOpportunities: number;
};

type Analytics = {
  questionsAnsweredAllTime: number;
  questionsAnsweredThisWeek: number;
  categoryBars: { name: string; value: number }[];
  dauLine: { date: string; users: number }[];
  signupLine: { date: string; count: number }[];
  featureUsage: { name: string; value: number }[];
  topXp: { id: string; name: string; email: string; xp: number; weeklyXP: number }[];
  pending: { questions: number; mockInterview: number; vault: number };
};

type ContentPayload = {
  pendingQuestions: Array<{
    id: string;
    question: string;
    category: string;
    difficulty: string;
    submittedById: string | null;
    createdAt: string;
  }>;
  pendingMock: Array<{
    id: string;
    question: string;
    bankSource: string;
    category: string;
    submittedById: string | null;
    createdAt: string;
  }>;
  pendingVault: Array<{
    id: string;
    type: string;
    targetFirm: string | null;
    fileUrl: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    status: string;
    createdAt: string;
    reporter: { id: string; name: string; email: string };
  }>;
  templates: Array<{
    id: string;
    title: string;
    category: string;
    subject: string | null;
    body: string;
    tags: string[];
    isOfficial: boolean;
    archived: boolean;
    createdAt: string;
  }>;
};

type ApiUsagePayload = {
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  featureBreakdown: Array<{
    feature: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    estCostUsd: number;
  }>;
};

type UserDetailPayload = {
  user: AdminUserRow & { _count?: { contacts?: number; opportunities?: number } };
  breakdown: {
    questionsMastered: number;
    drillLogs: Array<{ date: string; questionsAnswered: number; correct: number; xpEarned: number }>;
    mockInterviewSessions: Array<{ id: string; mode: string; completedAt: string | null }>;
    apiUsageRecent: Array<{
      id: string;
      feature: string;
      inputTokens: number;
      outputTokens: number;
      createdAt: string;
    }>;
  };
};

function isUserDetailPayload(x: unknown): x is UserDetailPayload {
  if (!x || typeof x !== "object") return false;
  return "user" in x && "breakdown" in x;
}

function isUserDetailError(x: unknown): x is { error: true } {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in x &&
    (x as { error?: unknown }).error === true
  );
}

function UserDetailPanel({
  data,
  selfId,
  onPatchRole,
  onPatchActive,
}: {
  data: UserDetailPayload;
  selfId: string | undefined;
  onPatchRole: (id: string, role: string) => void;
  onPatchActive: (id: string, accountActive: boolean) => void;
}) {
  const u = data.user;
  const d = data.breakdown;
  const isSelf = selfId === u.id;
  return (
    <div className="mt-4 space-y-4 text-sm">
      <p>
        <strong className="text-ink">{u.name}</strong> · {u.email}
      </p>
      <p className="text-ink-3">
        Role {u.role} · Joined {fmtDate(u.createdAt)} · Last active {fmtRelative(u.lastActiveAt ?? u.updatedAt)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSelf}
          className="rounded border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-border-strong disabled:opacity-40"
          onClick={() => onPatchRole(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}
        >
          {u.role === "ADMIN" ? "Demote to USER" : "Promote to ADMIN"}
        </button>
        {u.role !== "ADMIN" ? (
          <button
            type="button"
            disabled={isSelf}
            className="rounded border border-info bg-surface px-3 py-1.5 text-xs font-medium text-info hover:border-info disabled:opacity-40"
            onClick={() => onPatchRole(u.id, u.role === "MENTOR" ? "USER" : "MENTOR")}
          >
            {u.role === "MENTOR" ? "Remove mentor" : "Make Learn mentor"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={isSelf || !u.accountActive}
          className="rounded bg-danger-bg px-3 py-1.5 text-xs font-medium text-danger disabled:opacity-40"
          onClick={() => onPatchActive(u.id, false)}
        >
          Deactivate
        </button>
        {!u.accountActive && (
          <button
            type="button"
            className="rounded bg-success-bg px-3 py-1.5 text-xs font-medium text-success"
            onClick={() => onPatchActive(u.id, true)}
          >
            Reactivate
          </button>
        )}
      </div>
      {isSelf && (
        <p className="text-xs text-warn">
          You cannot change your own role or deactivate yourself here.
        </p>
      )}
      <div className="rounded border border-border p-3">
        <p className="text-xs font-medium uppercase text-ink-3">Breakdown</p>
        <ul className="mt-2 space-y-1 text-ink-2">
          <li>Questions mastered: {d.questionsMastered}</li>
          <li>Contacts: {u._count?.contacts ?? "—"}</li>
          <li>Opportunities: {u._count?.opportunities ?? "—"}</li>
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-ink-3">Recent drill days</p>
        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-ink-2">
          {d.drillLogs.map((log) => (
            <li key={log.date}>
              {log.date}: {log.questionsAnswered} answered, {log.correct} correct, +{log.xpEarned} XP
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-ink-3">Mock interviews</p>
        <ul className="mt-1 space-y-1 text-xs text-ink-2">
          {d.mockInterviewSessions.map((s) => (
            <li key={s.id}>
              {s.mode} · {s.completedAt ? fmtDate(s.completedAt) : "—"}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-ink-3">Recent AI calls</p>
        <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto font-mono text-[11px] text-ink-3">
          {d.apiUsageRecent.map((a) => (
            <li key={a.id}>
              {a.feature} · in {a.inputTokens} / out {a.outputTokens} · {fmtRelative(a.createdAt)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function fmtRelative(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function AdminDashboard() {
  const { data: session } = useSession();
  const selfId = session?.user?.id;

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [totals, setTotals] = useState({ totalUsers: 0, activeWeek: 0, activeMonth: 0 });
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [content, setContent] = useState<ContentPayload | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsagePayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [tplEdit, setTplEdit] = useState<ContentPayload["templates"][0] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const refreshAll = useCallback(async () => {
    setLoadErr(null);
    try {
      const [uRes, aRes, cRes, apiRes] = await Promise.all([
        fetch(`/api/admin/users?q=${encodeURIComponent(debouncedQ)}`),
        fetch("/api/admin/analytics"),
        fetch("/api/admin/content"),
        fetch("/api/admin/api-usage"),
      ]);
      if (!uRes.ok) throw new Error("Users failed");
      if (!aRes.ok) throw new Error("Analytics failed");
      if (!cRes.ok) throw new Error("Content failed");
      if (!apiRes.ok) throw new Error("API usage failed");
      const uJson = (await uRes.json()) as { users: AdminUserRow[]; totals: typeof totals };
      setUsers(uJson.users);
      setTotals(uJson.totals);
      setAnalytics(await aRes.json());
      setContent(await cRes.json());
      setApiUsage(await apiRes.json());
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Load failed");
    }
  }, [debouncedQ]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const openUser = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${id}`);
      if (!r.ok) throw new Error("Failed");
      setDetail(await r.json());
    } catch {
      setDetail({ error: true });
    } finally {
      setDetailLoading(false);
    }
  };

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    setActionMsg(null);
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setActionMsg((j as { error?: string }).error ?? "Update failed");
      return;
    }
    setActionMsg("Saved.");
    void refreshAll();
    if (detailId === id) void openUser(id);
  };

  const patchQuestion = async (id: string, status: string) => {
    const r = await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) setActionMsg("Question update failed");
    else {
      setActionMsg("Question updated.");
      void refreshAll();
    }
  };

  const patchMock = async (id: string, status: string) => {
    const r = await fetch(`/api/admin/mock-interview/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) setActionMsg("Mock question update failed");
    else {
      setActionMsg("Mock question updated.");
      void refreshAll();
    }
  };

  const patchVault = async (id: string, status: string) => {
    const r = await fetch(`/api/admin/vault/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) setActionMsg("Vault update failed");
    else {
      setActionMsg("Vault updated.");
      void refreshAll();
    }
  };

  const patchReport = async (id: string, status: string) => {
    const r = await fetch(`/api/admin/content-reports/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) setActionMsg("Report update failed");
    else {
      setActionMsg("Report updated.");
      void refreshAll();
    }
  };

  const saveTemplate = async () => {
    if (!tplEdit) return;
    const r = await fetch(`/api/admin/email-templates/${tplEdit.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: tplEdit.title,
        category: tplEdit.category,
        subject: tplEdit.subject,
        body: tplEdit.body,
        tags: tplEdit.tags,
        isOfficial: tplEdit.isOfficial,
      }),
    });
    if (!r.ok) setActionMsg("Template save failed");
    else {
      setActionMsg("Template saved.");
      setTplEdit(null);
      void refreshAll();
    }
  };

  const archiveTemplate = async (id: string) => {
    if (!confirm("Archive this template?")) return;
    const r = await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
    if (!r.ok) setActionMsg("Archive failed");
    else {
      setActionMsg("Template archived.");
      void refreshAll();
    }
  };

  const costDisplay = useMemo(() => {
    if (!apiUsage) return "—";
    return `$${apiUsage.estimatedCostUsd.toFixed(4)}`;
  }, [apiUsage]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="page-title">Admin dashboard</h1>
        <p className="mt-1 text-sm text-ink-3">Usage, users, content moderation, and AI usage.</p>
      </div>

      {loadErr && (
        <div className="rounded-lg border border-danger/40 bg-danger-bg px-4 py-3 text-sm text-danger">
          {loadErr}
        </div>
      )}
      {actionMsg && (
        <div className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-ink-2">
          {actionMsg}
        </div>
      )}

      {/* User management */}
      <section id="admin-users" className="scroll-mt-6 space-y-4">
        <h2 className="section-label">User management</h2>
        <div className="flex flex-wrap gap-4 text-sm text-ink-2">
          <span>
            Total users: <strong className="text-ink">{totals.totalUsers}</strong>
          </span>
          <span>
            Active (7d): <strong className="text-ink">{totals.activeWeek}</strong>
          </span>
          <span>
            Active (30d): <strong className="text-ink">{totals.activeMonth}</strong>
          </span>
        </div>
        <input
          type="search"
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Last active</th>
                <th className="px-3 py-2">Streak</th>
                <th className="px-3 py-2">XP</th>
                <th className="px-3 py-2">Mastered</th>
                <th className="px-3 py-2">Contacts</th>
                <th className="px-3 py-2">Pipeline</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer hover:bg-surface"
                  onClick={() => void openUser(u.id)}
                >
                  <td className="px-3 py-2 font-medium text-ink">{u.name}</td>
                  <td className="px-3 py-2 text-ink-2">{u.email}</td>
                  <td className="px-3 py-2 text-ink-2">{u.role}</td>
                  <td className="px-3 py-2 text-ink-3">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-2 text-ink-3">{fmtRelative(u.lastActiveAt ?? u.updatedAt)}</td>
                  <td className="px-3 py-2 text-ink-2">{u.drillStreak}</td>
                  <td className="px-3 py-2 text-ink-2">{u.xp}</td>
                  <td className="px-3 py-2 text-ink-2">{u.questionsMastered}</td>
                  <td className="px-3 py-2 text-ink-2">{u.contactsAdded}</td>
                  <td className="px-3 py-2 text-ink-2">{u.pipelineOpportunities}</td>
                  <td className="px-3 py-2">
                    {u.accountActive ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-danger">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytics */}
      {analytics && (
        <section className="space-y-4">
          <h2 className="section-label">Usage analytics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Questions answered (all time)"
              value={String(analytics.questionsAnsweredAllTime)}
            />
            <StatCard label="Questions answered (7d)" value={String(analytics.questionsAnsweredThisWeek)} />
            <StatCard label="Pending question approvals" value={String(analytics.pending.questions)} />
            <StatCard
              label="Pending mock / vault"
              value={`${analytics.pending.mockInterview} / ${analytics.pending.vault}`}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Most drilled categories (sample)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.categoryBars} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                  <XAxis type="number" allowDecimals={false} stroke="var(--ink-3)" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={130} interval={0} stroke="var(--ink-3)" tick={{ fontSize: 11 }} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} name="Progress rows" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Feature footprint (counts)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={analytics.featureUsage} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                  <XAxis type="number" stroke="var(--ink-3)" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={120} stroke="var(--ink-3)" tick={{ fontSize: 11 }} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Daily active users (30d)">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={analytics.dauLine}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                  <XAxis dataKey="date" stroke="var(--ink-3)" tick={{ fontSize: 9 }} />
                  <YAxis stroke="var(--ink-3)" tick={{ fontSize: 11 }} />
                  <Tooltip {...chartTooltip} />
                  <Line type="monotone" dataKey="users" stroke="var(--accent)" strokeWidth={2} dot={false} name="Users" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="New signups (30d)">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={analytics.signupLine}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                  <XAxis dataKey="date" stroke="var(--ink-3)" tick={{ fontSize: 9 }} />
                  <YAxis stroke="var(--ink-3)" tick={{ fontSize: 11 }} />
                  <Tooltip {...chartTooltip} />
                  <Line type="monotone" dataKey="count" stroke="var(--info)" strokeWidth={2} dot={false} name="Signups" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Top 10 by XP</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface text-xs text-ink-3">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">XP</th>
                    <th className="px-3 py-2">Weekly XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {analytics.topXp.map((u, i) => (
                    <tr key={u.id} className="hover:bg-surface">
                      <td className="px-3 py-2 text-ink-3">{i + 1}</td>
                      <td className="px-3 py-2 text-ink">{u.name}</td>
                      <td className="px-3 py-2 text-ink-3">{u.email}</td>
                      <td className="px-3 py-2 font-mono text-accent">{u.xp}</td>
                      <td className="px-3 py-2 text-ink-2">{u.weeklyXP}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      {content && (
        <section className="space-y-6">
          <h2 className="section-label">Content management</h2>

          <div>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Pending questions</h3>
            <ul className="space-y-2">
              {content.pendingQuestions.length === 0 && (
                <li className="text-sm text-ink-3">None pending.</li>
              )}
              {content.pendingQuestions.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 text-sm">
                    <p className="text-ink">{p.question.slice(0, 200)}{p.question.length > 200 ? "…" : ""}</p>
                    <p className="text-xs text-ink-3">
                      {p.category} · {p.difficulty} · {fmtDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="rounded bg-success-bg px-3 py-1.5 text-xs font-medium text-success hover:bg-success"
                      onClick={() => void patchQuestion(p.id, "active")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded bg-border-strong px-3 py-1.5 text-xs text-ink hover:bg-ink-3"
                      onClick={() => void patchQuestion(p.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Pending mock interview questions</h3>
            <ul className="space-y-2">
              {content.pendingMock.length === 0 && <li className="text-sm text-ink-3">None pending.</li>}
              {content.pendingMock.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 text-sm">
                    <p className="text-ink">{p.question.slice(0, 180)}{p.question.length > 180 ? "…" : ""}</p>
                    <p className="text-xs text-ink-3">
                      {p.bankSource} · {p.category} · {fmtDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="rounded bg-success-bg px-3 py-1.5 text-xs font-medium text-success hover:bg-success"
                      onClick={() => void patchMock(p.id, "active")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded bg-border-strong px-3 py-1.5 text-xs text-ink hover:bg-ink-3"
                      onClick={() => void patchMock(p.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Pending vault documents</h3>
            <ul className="space-y-2">
              {content.pendingVault.length === 0 && <li className="text-sm text-ink-3">None pending.</li>}
              {content.pendingVault.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 text-sm">
                    <p className="text-ink">
                      {p.type}
                      {p.targetFirm ? ` · ${p.targetFirm}` : ""}
                    </p>
                    {p.fileUrl && (
                      <a
                        href={p.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-ink underline-offset-4 hover:underline"
                      >
                        Open link
                      </a>
                    )}
                    {p.notes && <p className="text-xs text-ink-3">{p.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="rounded bg-success-bg px-3 py-1.5 text-xs font-medium text-success hover:bg-success"
                      onClick={() => void patchVault(p.id, "active")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded bg-border-strong px-3 py-1.5 text-xs text-ink hover:bg-ink-3"
                      onClick={() => void patchVault(p.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Reported content</h3>
            <ul className="space-y-2">
              {content.reports.length === 0 && <li className="text-sm text-ink-3">No open reports.</li>}
              {content.reports.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-surface p-3 text-sm"
                >
                  <p className="text-ink-2">
                    <span className="text-ink-3">{r.targetType}</span> ·{" "}
                    <code className="text-xs text-ink-3">{r.targetId}</code>
                  </p>
                  <p className="mt-1 text-ink-2">{r.reason}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    From {r.reporter.name} ({r.reporter.email}) · {fmtDate(r.createdAt)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-border-strong px-3 py-1 text-xs text-ink hover:bg-ink-3"
                      onClick={() => void patchReport(r.id, "reviewed")}
                    >
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      className="rounded bg-surface-2 px-3 py-1 text-xs text-ink-2 hover:bg-border-strong"
                      onClick={() => void patchReport(r.id, "dismissed")}
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-ink-2">Email templates</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-surface text-xs text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Official</th>
                    <th className="px-3 py-2">Archived</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {content.templates.map((t) => (
                    <tr key={t.id} className="hover:bg-surface">
                      <td className="px-3 py-2 text-ink">{t.title}</td>
                      <td className="px-3 py-2 text-ink-3">{t.category}</td>
                      <td className="px-3 py-2">{t.isOfficial ? "Yes" : "—"}</td>
                      <td className="px-3 py-2">{t.archived ? "Yes" : "—"}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="mr-2 text-ink underline-offset-4 hover:underline"
                          onClick={() => setTplEdit({ ...t })}
                        >
                          Edit
                        </button>
                        {!t.archived && (
                          <button
                            type="button"
                            className="text-danger hover:underline"
                            onClick={() => void archiveTemplate(t.id)}
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* API usage */}
      {apiUsage && (
        <section className="space-y-4">
          <h2 className="section-label">API usage (Anthropic)</h2>
          <p className="text-sm text-ink-3">
            Estimated cost (Claude Sonnet 4 list rates):{" "}
            <strong className="text-ink">{costDisplay}</strong> · Total calls:{" "}
            <strong className="text-ink">{apiUsage.totalCalls}</strong> · Tokens in/out:{" "}
            <strong className="text-ink">
              {apiUsage.inputTokens.toLocaleString()} / {apiUsage.outputTokens.toLocaleString()}
            </strong>
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-xs text-ink-3">
                <tr>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">Calls</th>
                  <th className="px-3 py-2">In tokens</th>
                  <th className="px-3 py-2">Out tokens</th>
                  <th className="px-3 py-2">Est. USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {apiUsage.featureBreakdown
                  .sort((a, b) => b.calls - a.calls)
                  .map((row) => (
                    <tr key={row.feature}>
                      <td className="px-3 py-2 font-mono text-xs text-ink-2">{row.feature}</td>
                      <td className="px-3 py-2 text-ink-2">{row.calls}</td>
                      <td className="px-3 py-2 text-ink-3">{row.inputTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-ink-3">{row.outputTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-ink-2">${row.estCostUsd.toFixed(4)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* User detail modal */}
      {detailId && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailId(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border-strong bg-surface p-5 ">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-medium text-ink">User activity</h3>
              <button
                type="button"
                className="text-ink-3 hover:text-ink-2"
                onClick={() => setDetailId(null)}
              >
                ✕
              </button>
            </div>
            {detailLoading && <p className="mt-4 text-sm text-ink-3">Loading…</p>}
            {!detailLoading && isUserDetailError(detail) && (
              <p className="mt-4 text-sm text-danger">Could not load user.</p>
            )}
            {!detailLoading && isUserDetailPayload(detail) && (
              <UserDetailPanel
                data={detail}
                selfId={selfId}
                onPatchRole={(id, role) => void patchUser(id, { role })}
                onPatchActive={(id, accountActive) => void patchUser(id, { accountActive })}
              />
            )}
          </div>
        </div>
      )}

      {tplEdit && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) setTplEdit(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border-strong bg-surface p-5">
            <h3 className="text-lg font-medium text-ink">Edit template</h3>
            <label className="mt-4 block text-xs text-ink-3">Title</label>
            <input
              className="mt-1 w-full rounded border border-border-strong bg-surface px-2 py-1.5 text-sm"
              value={tplEdit.title}
              onChange={(e) => setTplEdit({ ...tplEdit, title: e.target.value })}
            />
            <label className="mt-3 block text-xs text-ink-3">Category</label>
            <input
              className="mt-1 w-full rounded border border-border-strong bg-surface px-2 py-1.5 text-sm"
              value={tplEdit.category}
              onChange={(e) => setTplEdit({ ...tplEdit, category: e.target.value })}
            />
            <label className="mt-3 block text-xs text-ink-3">Subject</label>
            <input
              className="mt-1 w-full rounded border border-border-strong bg-surface px-2 py-1.5 text-sm"
              value={tplEdit.subject ?? ""}
              onChange={(e) => setTplEdit({ ...tplEdit, subject: e.target.value || null })}
            />
            <label className="mt-3 block text-xs text-ink-3">Body</label>
            <textarea
              className="mt-1 h-40 w-full rounded border border-border-strong bg-surface px-2 py-1.5 font-mono text-xs"
              value={tplEdit.body}
              onChange={(e) => setTplEdit({ ...tplEdit, body: e.target.value })}
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-2">
              <input
                type="checkbox"
                checked={tplEdit.isOfficial}
                onChange={(e) => setTplEdit({ ...tplEdit, isOfficial: e.target.checked })}
              />
              Official
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2"
                onClick={() => setTplEdit(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded border border-border-strong bg-surface px-4 py-1.5 text-sm font-medium text-ink hover:border-border-strong hover:bg-surface-2"
                onClick={() => void saveTemplate()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-ink-2">{title}</h3>
      {children}
    </div>
  );
}
