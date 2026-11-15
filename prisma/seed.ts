import { prisma } from "../src/lib/prisma";

const sampleTasks = [
  {
    id: "87df012d-8fe1-4ad0-89a8-6ab88b885df1",
    title: "Plan the customer onboarding refresh",
    description: "Review feedback and map the revised onboarding steps.",
    category: "Product",
    priority: "HIGH" as const,
    status: "IN_PROGRESS" as const,
    dueDate: new Date("2026-11-18T00:00:00.000Z"),
    assigneeName: "Maya Johnson",
  },
  {
    id: "60a942e5-bf51-44c3-85c0-1641abe948e2",
    title: "Prepare the monthly research summary",
    description: "Share key findings from recent customer interviews.",
    category: "Research",
    priority: "MEDIUM" as const,
    status: "PENDING" as const,
    dueDate: new Date("2026-11-24T00:00:00.000Z"),
    assigneeName: "Ravi Kapoor",
  },
  {
    id: "ab5a8e8b-b9cf-49ec-92a1-2690c3398c1f",
    title: "Review accessibility checks",
    description: "Verify keyboard navigation and contrast on core screens.",
    category: "Design system",
    priority: "LOW" as const,
    status: "COMPLETED" as const,
    dueDate: new Date("2026-11-12T00:00:00.000Z"),
    assigneeName: "Ava Lee",
  },
];

async function main() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.TASKFLOW_ALLOW_DEV_SEED !== "1"
  ) {
    throw new Error(
      "The sample seed is development-only. Set NODE_ENV=development and TASKFLOW_ALLOW_DEV_SEED=1, and use a development database.",
    );
  }

  const result = await prisma.task.createMany({
    data: sampleTasks,
    skipDuplicates: true,
  });
  console.info(`Added ${result.count} development sample tasks.`);
}

main()
  .catch((error: unknown) => {
    console.error("Development task seed failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
