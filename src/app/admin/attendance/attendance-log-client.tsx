"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceRow } from "./page";

interface Props {
  rows: AttendanceRow[];
  tutors: [string, string][]; // [tutorId, tutorName]
  targetMonth: string;
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -6; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

function formatTime(time: string | null) {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

export function AttendanceLogClient({ rows, tutors, targetMonth }: Props) {
  const router = useRouter();
  const monthOptions = getMonthOptions();

  // Only attended lessons
  const attended = useMemo(() => rows.filter((r) => r.status === "attended"), [rows]);

  // Group by tutor
  const byTutor = useMemo(() => {
    const map: Record<string, { tutorName: string; lessons: AttendanceRow[] }> = {};
    for (const r of attended) {
      if (!map[r.tutorId]) map[r.tutorId] = { tutorName: r.tutorName, lessons: [] };
      map[r.tutorId].lessons.push(r);
    }
    // Sort each tutor's lessons by date desc
    for (const group of Object.values(map)) {
      group.lessons.sort((a, b) => {
        if (a.attendanceDate !== b.attendanceDate)
          return b.attendanceDate.localeCompare(a.attendanceDate);
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      });
    }
    return Object.entries(map).sort(([, a], [, b]) =>
      a.tutorName.localeCompare(b.tutorName)
    );
  }, [attended]);

  const totalEarnings = attended.reduce(
    (sum, r) => sum + (r.rateSnapshot ?? 0) * (r.extended30Min ? 4 / 3 : 1),
    0
  );

  const monthLabel = monthOptions.find((o) => o.value === targetMonth)?.label ?? targetMonth;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Attendance Log</h1>
          <p className="text-sm text-gray-500 mt-1">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          {attended.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Total lessons</p>
              <p className="text-lg font-semibold text-gray-900">{attended.length}</p>
            </div>
          )}
          {attended.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Total earnings</p>
              <p className="text-lg font-semibold text-emerald-700">${totalEarnings.toFixed(2)}</p>
            </div>
          )}
          <select
            value={targetMonth}
            onChange={(e) => router.push(`/admin/attendance?month=${e.target.value}`)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {byTutor.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-sm text-gray-400">
          No attendance recorded for {monthLabel}.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {byTutor.map(([tutorId, { tutorName, lessons }]) => {
            const tutorEarnings = lessons.reduce(
              (sum, r) => sum + (r.rateSnapshot ?? 0) * (r.extended30Min ? 4 / 3 : 1),
              0
            );
            const extended = lessons.filter((r) => r.extended30Min).length;

            return (
              <div key={tutorId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Tutor header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: "#0F1C3F" }}>
                      {tutorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tutorName}</p>
                      <p className="text-xs text-gray-400">
                        {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                        {extended > 0 ? ` · ${extended} extended (120 min)` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Earnings</p>
                    <p className="text-base font-semibold text-emerald-700">${tutorEarnings.toFixed(2)}</p>
                  </div>
                </div>

                {/* Lessons table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Student</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Subject</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Type</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Duration</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lessons.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {formatDate(r.attendanceDate)}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {formatTime(r.startTime)}
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">
                            {r.studentName}
                            {r.recurringGroupId && (
                              <span className="ml-1.5 text-[10px] font-semibold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">↻</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">{r.subject ?? "—"}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">
                            {r.lessonType === "individual" ? "1:1" : r.lessonType === "group" ? "Group" : "—"}
                          </td>
                          <td className="px-5 py-3 text-sm">
                            {r.extended30Min ? (
                              <span className="text-amber-600 font-medium">120 min</span>
                            ) : (
                              <span className="text-gray-400">90 min</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500 text-right hidden lg:table-cell">
                            {r.rateSnapshot != null ? `$${r.rateSnapshot}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
