import type { AvatarColor, Task } from "@/types/task";

export const avatarColors: Record<AvatarColor, string> = {
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  teal: "bg-teal-100 text-teal-700",
};

const avatarColorNames: AvatarColor[] = [
  "violet",
  "blue",
  "amber",
  "rose",
  "teal",
];

export function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function getAvatarColor(name: string): AvatarColor {
  const firstCharacter = name.trim().charCodeAt(0);
  const colorIndex =
    (Number.isNaN(firstCharacter) ? 0 : firstCharacter) %
    avatarColorNames.length;
  return avatarColorNames[colorIndex] ?? "violet";
}

export function formatDueDate(date: string) {
  if (!date) return "No due date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function isTaskOverdue(
  task: Task,
  today = new Date().toISOString().slice(0, 10),
) {
  return (
    task.status !== "Completed" && task.dueDate !== "" && task.dueDate < today
  );
}
