export function getProductionConfigErrors(
  env: Record<string, string | undefined>,
) {
  const errors: string[] = [];

  if (env.NEXT_PUBLIC_API_MODE !== "database") {
    errors.push('NEXT_PUBLIC_API_MODE must be "database".');
  }

  for (const name of ["DATABASE_URL", "AUTH_SECRET", "AUTH_TRUST_HOST"]) {
    if (!env[name]?.trim()) {
      errors.push(`${name} is required.`);
    }
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl) {
    try {
      const parsedUrl = new URL(databaseUrl);
      if (
        !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
        parsedUrl.hostname.toLowerCase() === "host" ||
        parsedUrl.username.toLowerCase() === "user" ||
        parsedUrl.password.toLowerCase() === "password" ||
        parsedUrl.pathname.toLowerCase() === "/db"
      ) {
        errors.push("DATABASE_URL must be a real PostgreSQL connection URL.");
      }
    } catch {
      errors.push("DATABASE_URL must be a valid PostgreSQL connection URL.");
    }
  }

  const authSecret = env.AUTH_SECRET?.trim();
  if ((authSecret?.length ?? 0) < 32 || authSecret?.startsWith("replace-with-")) {
    errors.push(
      "AUTH_SECRET must be a non-placeholder value of at least 32 characters.",
    );
  }

  if (env.AUTH_TRUST_HOST?.trim() && env.AUTH_TRUST_HOST !== "true") {
    errors.push('AUTH_TRUST_HOST must be set to "true".');
  }

  return errors;
}
