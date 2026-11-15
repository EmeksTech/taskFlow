import "server-only";

import { randomBytes } from "node:crypto";
import Credentials from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientAddress } from "@/lib/auth/rateLimit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isDatabaseMode } from "@/lib/auth/server";
import { loginSchema } from "@/lib/auth/validation";

let dummyPasswordHash: Promise<string> | undefined;

function getDummyPasswordHash() {
  dummyPasswordHash ??= hashPassword(randomBytes(32));
  return dummyPasswordHash;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email address", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!isDatabaseMode()) return null;

        const address = getClientAddress(request.headers);
        const ipAllowed = await consumeRateLimit(
          `login-ip:${address}`,
          40,
          15 * 60 * 1000,
        );
        if (!ipAllowed) return null;

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const accountAllowed = await consumeRateLimit(
          `login-account:${address}:${email}`,
          8,
          15 * 60 * 1000,
        );
        if (!accountAllowed) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            sessionVersion: true,
          },
        });
        const passwordHash = user?.passwordHash ?? (await getDummyPasswordHash());
        let passwordMatches = false;

        try {
          passwordMatches = await verifyPassword(passwordHash, password);
        } catch {
          console.error("[Auth] Password hash verification failed.");
        }

        if (!user || !user.passwordHash || !passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        const sessionVersion =
          "sessionVersion" in user ? user.sessionVersion : undefined;
        if (typeof sessionVersion !== "number") return null;
        token.sessionVersion = sessionVersion;
      }

      if (!token.sub || typeof token.sessionVersion !== "number") return null;

      const currentUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          name: true,
          email: true,
          sessionVersion: true,
        },
      });

      if (
        !currentUser ||
        currentUser.sessionVersion !== token.sessionVersion
      ) {
        return null;
      }

      token.name = currentUser.name;
      token.email = currentUser.email;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
