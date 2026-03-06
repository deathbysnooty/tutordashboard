"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { signOutAction } from "@/app/actions/auth";

interface Props {
  userId: string;
  name: string;
  email: string;
  image: string;
}

export function PendingClient({ userId, name, email, image }: Props) {
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, "users", userId), async (snap) => {
      if (snap.data()?.status === "active") {
        await update();
        router.push("/dashboard");
      }
    });

    return () => unsub();
  }, [userId, update, router]);

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0F1C3F" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 flex flex-col items-center gap-6 mx-4">
        {/* Spinner */}
        <div className="relative">
          <div
            className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "#F5A623", borderTopColor: "transparent" }}
          />
        </div>

        {/* User info */}
        <div className="flex flex-col items-center gap-2 text-center">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name}
              className="w-14 h-14 rounded-full border-2 border-gray-100"
            />
          )}
          <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
          <p className="text-sm text-gray-500">{email}</p>
        </div>

        {/* Message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800">
            Waiting for access
          </h3>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            You&apos;re signed in! Your account is pending approval by the
            admin. You&apos;ll be redirected automatically once access is
            granted — no need to refresh.
          </p>
        </div>

        {/* Sign out */}
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
