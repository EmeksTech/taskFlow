"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getApiError } from "@/components/auth/apiError";

export function ProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
        }),
      });
      if (!response.ok) {
        setError(await getApiError(response));
        return;
      }
      setSuccess("Profile updated.");
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
          Full name
        </span>
        <input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Email address
        </span>
        <input
          name="email"
          type="email"
          defaultValue={email}
          required
          maxLength={320}
          autoComplete="email"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-800">{success}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
