import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "magic-link",
      name: "Magic link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const raw = String(credentials?.token ?? "");
        if (!raw) return null;
        const hashed = createHash("sha256").update(raw).digest("hex");
        const record = await prisma.verificationToken.findUnique({ where: { token: hashed } });
        if (!record || record.expires < new Date()) return null;

        await prisma.verificationToken.delete({ where: { token: hashed } });
        const user = await prisma.user.findUnique({ where: { email: record.identifier } });
        if (!user || !user.isActive) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});

/** Security boundary: admin routes and mutations must only proceed for Role.ADMIN. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}
