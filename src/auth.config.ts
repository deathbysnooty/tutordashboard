import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-compatible config — no Firebase Admin imports.
// Used by middleware. auth.ts extends this with Firestore callbacks.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      session.user.status = token.status as string;
      return session;
    },
  },
  trustHost: true,
};
