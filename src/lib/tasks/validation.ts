import { z } from "zod";

export const taskStatusSchema = z.enum([
  "Pending",
  "In Progress",
  "Completed",
]);

export const taskPrioritySchema = z.enum(["Low", "Medium", "High"]);

const taskFields = {
  title: z.string().trim().min(1, "Enter a task title.").max(200),
  description: z.string().trim().max(5000).optional(),
  assignee: z.string().trim().max(120).optional(),
  category: z.string().trim().max(100).optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  dueDate: z.union([z.literal(""), z.iso.date()]).optional(),
};

export const createTaskSchema = z.strictObject(taskFields);

export const updateTaskSchema = z
  .strictObject({
    title: taskFields.title.optional(),
    description: taskFields.description,
    assignee: taskFields.assignee,
    category: taskFields.category,
    priority: taskFields.priority,
    status: taskFields.status,
    dueDate: taskFields.dueDate,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Include at least one task field to update.",
  });

export const taskQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: z.string().trim().min(1).optional(),
  assignee: z.string().trim().min(1).optional(),
  dueBefore: z.iso.date().optional(),
  dueAfter: z.iso.date().optional(),
  sortBy: z
    .enum([
      "title",
      "category",
      "priority",
      "status",
      "dueDate",
      "createdAt",
      "updatedAt",
    ])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTaskData = z.infer<typeof createTaskSchema>;
export type UpdateTaskData = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
