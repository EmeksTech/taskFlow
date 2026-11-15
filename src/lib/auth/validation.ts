import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email().max(320));

const nameSchema = z.string().trim().min(2).max(100);
const passwordSchema = z.string().min(12).max(128);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const registrationSchema = z
  .strictObject({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const profileUpdateSchema = z
  .strictObject({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Include a name or email address to update.",
  });

export const passwordChangeSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1).max(128),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Passwords do not match.",
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current password.",
  });

export type LoginData = z.infer<typeof loginSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;
