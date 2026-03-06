import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";
import { signOutAction } from "@/app/actions/auth";
import { AdminNav } from "./admin-nav";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const snapshot = await adminDb
    .collection("users")
    .where("status", "==", "pending")
    .get();
  const pendingCount = snapshot.size;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FB" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#0F1C3F" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-base sm:text-lg truncate" style={{ color: "#F5A623" }}>
              Photon Academy
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: "rgba(245,166,35,0.2)", color: "#F5A623" }}
            >
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard"
              className="text-xs sm:text-sm font-medium transition-colors hover:text-white whitespace-nowrap"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              ← Tutor View
            </Link>
            <span className="text-sm hidden md:block" style={{ color: "rgba(255,255,255,0.4)" }}>
              {session?.user?.name}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs sm:text-sm hover:text-white transition-colors whitespace-nowrap"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <AdminNav pendingCount={pendingCount} />

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
