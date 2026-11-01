import { requireUserId } from "@/lib/auth";
import { loadTasks } from "@/lib/tasks-data";
import { syncFollowupTasks } from "@/lib/followup-tasks";
import { PageHeader } from "@/components/ui/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const userId = await requireUserId();
  // Make sure automatic follow-ups reflect the latest interactions before listing them.
  await syncFollowupTasks(userId).catch((e) => console.error("followup sync failed", e));
  const tasks = await loadTasks(userId, { includeDone: true });
  return (
    <div className="space-y-5">
      <PageHeader title="Tasks" subtitle="Follow-ups worked out from your interactions, plus the next steps you've set. Press T to add one." />
      <TasksBoard tasks={tasks} />
    </div>
  );
}
