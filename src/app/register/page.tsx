import { redirect } from "next/navigation";
import {
  AuthFrame,
  AuthModeNotice,
} from "@/components/auth/AuthFrame";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { isDatabaseMode } from "@/lib/auth/server";

export default async function RegisterPage() {
  if (!isDatabaseMode()) return <AuthModeNotice />;

  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.user?.id) redirect("/");

  return (
    <AuthFrame
      title="Create your account"
      description="Create a secure account to keep your tasks private and organized."
    >
      <RegisterForm />
    </AuthFrame>
  );
}
