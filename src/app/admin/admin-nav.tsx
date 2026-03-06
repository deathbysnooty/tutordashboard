"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  label: string;
  href: string;
  badge?: number;
}

interface Props {
  pendingCount: number;
}

export function AdminNav({ pendingCount }: Props) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: "Users", href: "/admin/users", badge: pendingCount > 0 ? pendingCount : undefined },
    { label: "Students", href: "/admin/students" },
    { label: "Timetable", href: "/admin/timetable" },
    { label: "Attendance Log", href: "/admin/attendance" },
    { label: "Sync to Sheet", href: "/admin/sync" },
  ];

  return (
    <div className="border-b border-gray-200 bg-white overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex gap-0.5 sm:gap-1 min-w-max sm:min-w-0">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-[#0F1C3F] text-[#0F1C3F]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: "#F5A623" }}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
