"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { TimetableEvent } from "./page";
import { adminSaveAttendance, type AdminAttendanceEntry } from "@/app/actions/lessons";

const SUBJECTS = ["Math", "Physics", "Economics", "English", "TOK", "Business Studies", "Chemistry"];

const TUTOR_COLORS = [
  "#0F1C3F", "#7C3AED", "#059669", "#DC2626", "#D97706",
  "#0891B2", "#DB2777", "#65A30D", "#EA580C", "#4F46E5",
];

interface Props {
  events: TimetableEvent[];
  tutors: [string, string][];
  targetMonth: string;
  allStudents: { id: string; name: string }[];
  allTutors: { id: string; name: string }[];
}

type SessionRow = {
  studentId: string;
  time: string;
  subject: string;
  lessonType: "group" | "individual" | "";
  extended: boolean;
  recurring: boolean;
};

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

export function TimetableClient({ events, tutors, targetMonth, allStudents, allTutors }: Props) {
  const router = useRouter();
  const [selectedTutor, setSelectedTutor] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [modalTutor, setModalTutor] = useState(allTutors[0]?.id ?? "");
  const [modalDate, setModalDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [sessions, setSessions] = useState<SessionRow[]>([
    { studentId: allStudents[0]?.id ?? "", time: "09:00", subject: "", lessonType: "", extended: false, recurring: false },
  ]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

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
          <button
            onClick={() => { setShowModal(true); setError(""); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "#F5A623" }}
          >
            + Add Lesson
          </button>
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

      {/* Add Lesson Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Add Lesson</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 flex flex-col gap-4">
              {/* Tutor */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tutor</label>
                <select
                  value={modalTutor}
                  onChange={(e) => setModalTutor(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
                >
                  {allTutors.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
                />
              </div>

              {/* Sessions */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Students</label>
                <div className="flex flex-col gap-3">
                  {sessions.map((s, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={s.studentId}
                          onChange={(e) => setSessions((prev) => prev.map((r, i) => i === idx ? { ...r, studentId: e.target.value } : r))}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                        >
                          {allStudents.map((st) => (
                            <option key={st.id} value={st.id}>{st.name}</option>
                          ))}
                        </select>
                        {sessions.length > 1 && (
                          <button onClick={() => setSessions((prev) => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={s.time}
                          onChange={(e) => setSessions((prev) => prev.map((r, i) => i === idx ? { ...r, time: e.target.value } : r))}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none w-28"
                        />
                        <select
                          value={s.subject}
                          onChange={(e) => setSessions((prev) => prev.map((r, i) => i === idx ? { ...r, subject: e.target.value } : r))}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                        >
                          <option value="">Subject</option>
                          {SUBJECTS.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                        <select
                          value={s.lessonType}
                          onChange={(e) => setSessions((prev) => prev.map((r, i) => i === idx ? { ...r, lessonType: e.target.value as "group" | "individual" | "" } : r))}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                        >
                          <option value="">Type</option>
                          <option value="individual">1:1</option>
                          <option value="group">Group</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={s.extended} onChange={(e) => setSessions((prev) => prev.map((r, i) => i === idx ? { ...r, extended: e.target.checked } : r))} className="rounded" />
                          120 min
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={s.recurring} onChange={(e) => setSessions((prev) => prev.map((r, i) => i === idx ? { ...r, recurring: e.target.checked } : r))} className="rounded" />
                          ↻ Weekly recurring
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSessions((prev) => [...prev, { studentId: allStudents[0]?.id ?? "", time: "09:00", subject: "", lessonType: "", extended: false, recurring: false }])}
                  className="mt-2 text-xs text-[#0F1C3F] font-medium hover:underline"
                >
                  + Add another student
                </button>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button
                disabled={isPending || !modalTutor || !modalDate}
                onClick={() => {
                  setError("");
                  const entries: AdminAttendanceEntry[] = sessions.map((s) => ({
                    studentId: s.studentId,
                    startTime: s.time || null,
                    subject: s.subject || null,
                    lessonType: (s.lessonType || null) as "group" | "individual" | null,
                    extended30Min: s.extended,
                    recurring: s.recurring,
                  }));
                  startTransition(async () => {
                    try {
                      await adminSaveAttendance(modalTutor, modalDate, entries);
                      setShowModal(false);
                      setSessions([{ studentId: allStudents[0]?.id ?? "", time: "09:00", subject: "", lessonType: "", extended: false, recurring: false }]);
                      router.refresh();
                    } catch {
                      setError("Failed to save. Please try again.");
                    }
                  });
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#0F1C3F" }}
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
