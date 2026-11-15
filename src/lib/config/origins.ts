export function parseTrustedOrigins(value?: string) {
  if (!value?.trim()) return new Set<string>();

  const entries = value.split(",").map((entry) => entry.trim());
  if (entries.some((entry) => entry.length === 0)) {
    throw new Error("Trusted origins must be comma-separated origin URLs.");
  }

  const origins = new Set<string>();

  for (const entry of entries) {
    let parsed: URL;
    try {
      parsed = new URL(entry);
    } catch {
      throw new Error("Trusted origins must be valid HTTP or HTTPS origins.");
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== entry ||
      parsed.username.length > 0 ||
      parsed.password.length > 0
    ) {
      throw new Error("Trusted origins must be bare HTTP or HTTPS origins.");
    }

    origins.add(parsed.origin);
  }

  return origins;
}
