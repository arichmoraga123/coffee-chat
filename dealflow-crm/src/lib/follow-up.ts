import { addDays, addHours, addMonths, isAfter } from "date-fns";

export type FollowUpStep = {
  label: string;
  dueAt: Date;
  isOverdue: boolean;
};

export function getFollowUpSteps(lastInteractionDate: Date): FollowUpStep[] {
  const now = new Date();
  const milestones = [
    { label: "Send a thank-you email", dueAt: addHours(lastInteractionDate, 24) },
    { label: "Follow up with a article/resource you mentioned", dueAt: addDays(lastInteractionDate, 7) },
    { label: "Check in - update them on your recruiting progress", dueAt: addMonths(lastInteractionDate, 1) },
    { label: "Re-engage - send a light touch-base", dueAt: addMonths(lastInteractionDate, 3) },
  ];

  return milestones.map((step) => ({
    ...step,
    isOverdue: isAfter(now, step.dueAt),
  }));
}

export type FollowUpStatus = "green" | "yellow" | "red";

export function getFollowUpStatus(lastInteractionDate: Date | null): FollowUpStatus {
  if (!lastInteractionDate) return "red";
  const now = new Date();
  const oneWeekDue = addDays(lastInteractionDate, 7);
  const oneMonthDue = addMonths(lastInteractionDate, 1);
  if (isAfter(now, oneMonthDue)) return "red";
  if (isAfter(now, oneWeekDue)) return "yellow";
  return "green";
}
