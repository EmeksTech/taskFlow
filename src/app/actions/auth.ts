"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/auth/validation";

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (process.env.NEXT_PUBLIC_API_MODE !== "database") {
    return { error: "Sign in is available only in database mode." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address and password." };
  }

  try {
    const { signIn } = await import("@/auth");
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { error: "Email or password is incorrect." };
    }
    throw error;
  }

  return {};
}

export async function logoutAction() {
  if (process.env.NEXT_PUBLIC_API_MODE === "database") {
    const { signOut } = await import("@/auth");
    await signOut({ redirectTo: "/login" });
  }

  redirect("/");
}
