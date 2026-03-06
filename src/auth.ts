import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (!account?.providerAccountId || !user.email) return false;

      try {
        const userId = account.providerAccountId;
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          const isBootstrap =
            user.email === process.env.BOOTSTRAP_ADMIN_EMAIL;

          await userRef.set({
            email: user.email,
            name: user.name ?? "",
            photoUrl: user.image ?? "",
            role: isBootstrap ? "admin" : "tutor",
            status: isBootstrap ? "active" : "pending",
            createdAt: FieldValue.serverTimestamp(),
            approvedAt: isBootstrap ? FieldValue.serverTimestamp() : null,
            approvedBy: null,
          });
        }

        return true;
      } catch (error) {
        console.error("[signIn] Firestore error:", error);
        return false;
      }
    },

    async jwt({ token, account, trigger }) {
      if (account) {
        token.userId = account.providerAccountId;
        const userDoc = await adminDb
          .collection("users")
          .doc(account.providerAccountId)
          .get();
        const data = userDoc.data();
        token.role = data?.role ?? "tutor";
        token.status = data?.status ?? "pending";
      }

      if (trigger === "update" && token.userId) {
        const userDoc = await adminDb
          .collection("users")
          .doc(token.userId as string)
          .get();
        const data = userDoc.data();
        token.role = data?.role;
        token.status = data?.status;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as string;
      session.user.status = token.status as string;
      return session;
    },
  },
});
