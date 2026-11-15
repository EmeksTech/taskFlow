"use client";

import { useState, type FormEvent } from "react";

const availableScopes = [
  { value: "tasks:read", label: "Read tasks" },
  { value: "tasks:write", label: "Create, update, and delete tasks" },
  { value: "profile:read", label: "Read my profile in Postman" },
] as const;

export interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
}

interface CreatedToken {
  token: string;
  accessToken: ApiToken;
}

async function responseMessage(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    return body.error?.message ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface ApiTokensManagerProps {
  initialTokens: ApiToken[];
  initialError?: string | null;
}

export function ApiTokensManager({
  initialTokens,
  initialError = null,
}: ApiTokensManagerProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["tasks:read"]);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadTokens() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tokens", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setTokens((await response.json()) as ApiToken[]);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load API tokens.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((value) => value !== scope)
        : [...current, scope],
    );
  }

  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setCreatedToken(null);

    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, scopes, expiresInDays }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));

      const result = (await response.json()) as CreatedToken;
      setCreatedToken(result);
      setTokens((current) => [result.accessToken, ...current]);
      setName("");
      setNotice("Copy this token now. It will not be shown again.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the API token.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeToken(tokenId: string) {
    if (!window.confirm("Revoke this API token? Clients using it will stop working.")) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/tokens/${encodeURIComponent(tokenId)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(await responseMessage(response));

      setTokens((current) => current.filter((token) => token.id !== tokenId));
      setNotice("API token revoked.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to revoke the API token.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCreatedToken() {
    if (!createdToken) return;

    try {
      await navigator.clipboard.writeText(createdToken.token);
      setNotice("Token copied. Store it somewhere safe.");
    } catch {
      setError("Clipboard access failed. Select and copy the token manually.");
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-slate-900">Create an API token</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Use tokens with Postman or a trusted server-side client. Never put a
          token in a browser bundle, public environment variable, or localStorage.
        </p>

        <form onSubmit={createToken} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Token name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Classroom Postman"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">
              Permissions
            </legend>
            <div className="space-y-2">
              {availableScopes.map((scope) => (
                <label key={scope.value} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>{scope.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Expires after
            </span>
            <select
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(Number(event.target.value))}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {[1, 7, 30, 90, 365].map((days) => (
                <option key={days} value={days}>
                  {days} {days === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={submitting || scopes.length === 0}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create token"}
          </button>
        </form>

        {createdToken && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Copy this token now. It cannot be retrieved later.
            </p>
            <code className="mt-3 block overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-800">
              {createdToken.token}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyCreatedToken()}
                className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
              >
                Copy token
              </button>
              <button
                type="button"
                onClick={() => setCreatedToken(null)}
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white"
              >
                I saved it
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Active tokens</h2>
            <p className="mt-1 text-sm text-slate-500">
              Revoked and expired tokens are not listed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void loadTokens();
            }}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="mt-5 text-sm text-slate-500">Loading tokens…</p>}
        {!loading && !error && tokens.length === 0 && (
          <p className="mt-5 text-sm text-slate-500">No active API tokens.</p>
        )}
        {tokens.length > 0 && (
          <ul className="mt-5 divide-y divide-slate-100">
            {tokens.map((token) => (
              <li key={token.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {token.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {token.tokenPrefix}…
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {token.scopes.join(", ")} · Expires {formatDate(token.expiresAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatDate(token.createdAt)}
                    {token.lastUsedAt
                      ? ` · Last used ${formatDate(token.lastUsedAt)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeToken(token.id)}
                  disabled={submitting}
                  className="self-start rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 sm:self-center"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    </div>
  );
}
