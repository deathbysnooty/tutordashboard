"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { TimetableEvent } from "./page";

const TUTOR_COLORS = [
  "#0F1C3F", "#7C3AED", "#059669", "#DC2626", "#D97706",
  "#0891B2", "#DB2777", "#65A30D", "#EA580C", "#4F46E5",
];

interface Props {
  events: TimetableEvent[];
  tutors: [string, string][];
  targetMonth: string;
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export function TimetableClient({ events, tutors, targetMonth }: Props) {
  const router = useRouter();
  const [selectedTutor, setSelectedTutor] = useState<string>("all");

  const tutorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tutors.forEach(([id], i) => {
      map[id] = TUTOR_COLORS[i % TUTOR_COLORS.length];
    });
    return map;
  }, [tutors]);

  const filtered = useMemo(
    () => selectedTutor === "all" ? events : events.filter((e) => e.tutorId === selectedTutor),
    [events, selectedTutor]
  );

  const calendarEvents = useMemo(() =>
    filtered.map((e) => {
      const title = [e.studentName, e.subject].filter(Boolean).join(" · ");
      const color = tutorColorMap[e.tutorId] ?? "#0F1C3F";
      return {
        id: e.id,
        title,
        date: e.attendanceDate,
        backgroundColor: e.status === "attended" ? color : `${color}66`,
        borderColor: color,
        textColor: "#fff",
        extendedProps: e,
      };
    }),
    [filtered, tutorColorMap]
  );

  const [mYear, mMon] = targetMonth.split("-").map(Number);
  const initialDate = `${mYear}-${String(mMon).padStart(2, "0")}-01`;
  const monthOptions = getMonthOptions();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Timetable</h1>
        <div className="flex items-center gap-3">
          {/* Tutor filter */}
          <select
            value={selectedTutor}
            onChange={(e) => setSelectedTutor(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
          >
            <option value="all">All Tutors</option>
            {tutors.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          {/* Month picker */}
          <select
            value={targetMonth}
            onChange={(e) => router.push(`/admin/timetable?month=${e.target.value}`)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tutor legend */}
      {selectedTutor === "all" && tutors.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {tutors.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setSelectedTutor(id)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: tutorColorMap[id] }}
              />
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          initialDate={initialDate}
          events={calendarEvents}
          headerToolbar={false}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={4}
          eventClassNames="text-xs font-medium px-1 rounded truncate"
        />
      </div>
    </div>
  );
}
