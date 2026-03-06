import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.status === "active") redirect("/dashboard");
  if (session?.user?.status === "pending") redirect("/pending");

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0F1C3F" }}
    >
      <div className="flex flex-col items-center gap-10 px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(245, 166, 35, 0.15)" }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Atom / photon icon */}
              <ellipse
                cx="24"
                cy="24"
                rx="22"
                ry="8"
                stroke="#F5A623"
                strokeWidth="2"
                fill="none"
              />
              <ellipse
                cx="24"
                cy="24"
                rx="22"
                ry="8"
                stroke="#F5A623"
                strokeWidth="2"
                fill="none"
                transform="rotate(60 24 24)"
              />
              <ellipse
                cx="24"
                cy="24"
                rx="22"
                ry="8"
                stroke="#F5A623"
                strokeWidth="2"
                fill="none"
                transform="rotate(120 24 24)"
              />
              <circle cx="24" cy="24" r="3.5" fill="#F5A623" />
            </svg>
          </div>
          <div className="text-center">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: "#F5A623" }}
            >
              Photon Academy
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              Singapore
            </p>
          </div>
        </div>

        {/* Sign in card */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to access your tutor dashboard
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Google "G" logo */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-xs text-center text-gray-400">
            Access is restricted to approved Photon Academy tutors.
            <br />
            New accounts require admin approval.
          </p>
        </div>
      </div>
    </main>
  );
}
