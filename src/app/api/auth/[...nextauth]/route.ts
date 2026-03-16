import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * Build the list of configured OAuth providers at startup.
 *
 * Providers are only added when BOTH the client ID and client secret
 * environment variables are set and non-empty.  Silently enabling a
 * provider with empty credentials causes confusing runtime errors and
 * exposes an unauthenticated OAuth callback endpoint.
 */
function buildOAuthProviders() {
  const providers = [];

  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    providers.push(
      GithubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    );
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  /**
   * Use the JWT session strategy.
   *
   * PrismaAdapter is intentionally NOT used here because mixing
   * PrismaAdapter with the "jwt" session strategy causes
   * CredentialsProvider to break: the adapter tries to persist sessions
   * to the database, but JWT sessions are stateless.  Use either:
   *   a) JWT strategy (no adapter) — suitable for CredentialsProvider
   *   b) Database strategy + PrismaAdapter — suitable for OAuth-only flows
   *
   * This app supports CredentialsProvider, so we use JWT sessions without
   * an adapter.  If you later add OAuth-only support and want database
   * sessions, remove CredentialsProvider and re-enable PrismaAdapter with
   * `session: { strategy: "database" }`.
   */
  session: {
    strategy: "jwt",
  },

  providers: [
    ...buildOAuthProviders(),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Normalize the email before lookup so casing differences do not
        // prevent a valid user from logging in.
        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string }).id =
          token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
