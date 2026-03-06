"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";

interface Props {
  userName: string;
  isAdmin: boolean;
}

export function AppNav({ userName, isAdmin }: Props) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/students", label: "Students" },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center h-14 gap-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-2">
          <span className="font-bold text-base" style={{ color: "#0F1C3F" }}>
            Photon Academy
          </span>
          {isAdmin && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#F5A623", color: "#0F1C3F" }}
            >
              Admin
            </span>
          )}
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "text-[#0F1C3F] bg-[#0F1C3F]/8"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "text-[#0F1C3F] bg-[#0F1C3F]/8"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              Admin
            </Link>
          )}
          <span className="text-sm text-gray-400 hidden sm:block">{userName}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
