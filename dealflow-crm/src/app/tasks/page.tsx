import { prisma } from "@/lib/prisma";
import { TasksList } from "@/components/tasks-list";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const userId = await requireUserId();
  const [tasks, contacts] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      include: { contact: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.contact.findMany({
      where: { userId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <TasksList
        contacts={contacts}
        initialTasks={tasks.map((t) => ({
          id: t.id,
          dueDate: t.dueDate.toISOString(),
          taskType: t.taskType,
          status: t.status,
          contactName: t.contact.fullName,
        }))}
      />
    </div>
  );
}
