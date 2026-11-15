"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getApiError } from "@/components/auth/apiError";

export function PasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(formData.get("currentPassword") ?? ""),
          newPassword: String(formData.get("newPassword") ?? ""),
          confirmNewPassword: String(formData.get("confirmNewPassword") ?? ""),
        }),
      });
      if (!response.ok) {
        setError(await getApiError(response));
        return;
      }

      form.reset();
      router.replace("/login?passwordChanged=1");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Current password
        </span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          New password
        </span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <span className="mt-1.5 block text-xs text-slate-500">
          Use 12–128 characters.
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Confirm new password
        </span>
        <input
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
