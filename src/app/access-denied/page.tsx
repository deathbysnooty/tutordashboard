import { signOutAction } from "@/app/actions/auth";
import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0F1C3F" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6 mx-4 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: "#FEF3C7" }}
        >
          🚫
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-2">
            You don&apos;t have permission to view this page.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/dashboard"
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white text-center transition-colors"
            style={{ backgroundColor: "#0F1C3F" }}
          >
            Go to Dashboard
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
