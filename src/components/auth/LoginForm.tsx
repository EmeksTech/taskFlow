"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  loginAction,
  type LoginActionState,
} from "@/app/actions/auth";

const initialState: LoginActionState = {};

export function LoginForm({ registered = false }: { registered?: boolean }) {
  const [state, action, isPending] = useActionState(loginAction, initialState);

  return (
    <>
      {registered && (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          Your account is ready. Sign in to continue.
        </p>
      )}
      <form action={action} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Email address
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-rose-700">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to TaskFlow?{" "}
        <Link
          href="/register"
          className="font-semibold text-emerald-800 hover:text-emerald-900"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
