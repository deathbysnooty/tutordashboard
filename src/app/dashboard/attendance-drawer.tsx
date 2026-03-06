"use client";

import { useState, useTransition } from "react";
import type { AttendanceEntry } from "@/app/actions/lessons";

interface StudentRow {
  tutorStudentId: string | null;
  studentId: string;
  name: string;
}

interface LessonRecord {
  id: string;
  studentId: string;
  tutorStudentId: string;
  attendanceDate: string;
  status: "attended" | "scheduled";
  extended30Min: boolean;
  rateSnapshot: number | null;
  startTime: string | null;
  subject: string | null;
  lessonType: "group" | "individual" | null;
  recurringGroupId: string | null;
}

interface Props {
  date: string;
  startTime: string | null;
  students: StudentRow[];
  existingLessons: LessonRecord[];
  onSave: (date: string, entries: AttendanceEntry[]) => Promise<void>;
  onDeleteLesson?: (lessonId: string) => Promise<void>;
  onDeleteSeries?: (recurringGroupId: string, fromDate: string) => Promise<void>;
  onClose: () => void;
  onAddStudent?: () => void;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-SG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const SUBJECTS = ["Math", "Physics", "Economics", "English", "TOK", "Business Studies", "Chemistry"];

type SessionEntry = {
  id?: string;
  recurringGroupId?: string;
  extended: boolean;
  recurring: boolean;
  time: string;
  subject: string;
  lessonType: "group" | "individual" | "";
};

type PendingDelete = { studentId: string; idx: number } | null;

export function AttendanceDrawer({
  date, startTime, students, existingLessons,
  onSave, onDeleteLesson, onDeleteSeries, onClose, onAddStudent,
}: Props) {
  // entries only holds students actually in this slot
  const [entries, setEntries] = useState<Record<string, SessionEntry[]>>(() => {
    const init: Record<string, SessionEntry[]> = {};
    for (const s of students) {
      const existing = existingLessons.filter(
        (l) => l.studentId === s.studentId && (l.status === "attended" || l.status === "scheduled")
      );
      if (existing.length > 0) {
        init[s.studentId] = existing.map((l) => ({
          id: l.id,
          recurringGroupId: l.recurringGroupId ?? undefined,
          extended: l.extended30Min,
          recurring: false,
          time: l.startTime ?? startTime ?? "",
          subject: l.subject ?? "",
          lessonType: l.lessonType ?? "",
        }));
      }
    }
    return init;
  });

  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  // Students not yet in this slot
  const studentsInSlot = new Set(Object.keys(entries));
  const availableToAdd = students.filter((s) => !studentsInSlot.has(s.studentId));
  const studentsInSlotList = students.filter((s) => studentsInSlot.has(s.studentId));

  function addStudentToSlot(studentId: string) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: [{ time: startTime ?? "", subject: "", lessonType: "", extended: false, recurring: false }],
    }));
  }

  function updateSession(studentId: string, idx: number, patch: Partial<SessionEntry>) {
    setEntries((prev) => {
      const sessions = [...prev[studentId]];
      sessions[idx] = { ...sessions[idx], ...patch };
      return { ...prev, [studentId]: sessions };
    });
  }

  function addSession(studentId: string) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: [...prev[studentId], { time: startTime ?? "", subject: "", lessonType: "", extended: false, recurring: false }],
    }));
  }

  function removeSession(studentId: string, idx: number) {
    setEntries((prev) => {
      const sessions = prev[studentId].filter((_, i) => i !== idx);
      if (sessions.length === 0) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: sessions };
    });
  }

  function handleXClick(studentId: string, idx: number) {
    const e = entries[studentId][idx];
    if (!e.id) {
      removeSession(studentId, idx);
      return;
    }
    setPendingDelete({ studentId, idx });
  }

  async function handleDeleteConfirm(deleteAll: boolean) {
    if (!pendingDelete) return;
    const { studentId, idx } = pendingDelete;
    const e = entries[studentId][idx];
    if (!e.id) return;

    setIsDeleting(true);
    try {
      if (deleteAll && e.recurringGroupId) {
        await onDeleteSeries?.(e.recurringGroupId, date);
      } else {
        await onDeleteLesson?.(e.id);
      }
      onClose();
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  }

  function handleSave() {
    const toSave: AttendanceEntry[] = [];
    for (const [studentId, sessions] of Object.entries(entries)) {
      const student = students.find((s) => s.studentId === studentId);
      if (!student) continue;
      for (const e of sessions) {
        toSave.push({
          lessonId: e.id,
          studentId,
          tutorStudentId: student.tutorStudentId,
          extended30Min: e.extended,
          startTime: e.time || null,
          subject: e.subject || null,
          lessonType: (e.lessonType as "group" | "individual") || null,
          recurring: e.recurring,
        });
      }
    }
    startTransition(async () => {
      await onSave(date, toSave);
    });
  }

  const hasEntries = studentsInSlot.size > 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Log Session</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(date)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">
            ×
          </button>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {studentsInSlotList.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              No students added yet. Select a student below to log their session.
            </p>
          )}

          {studentsInSlotList.map((s) => {
            const sessions = entries[s.studentId];
            return (
              <div key={s.studentId} className="rounded-xl border border-gray-100 bg-gray-50">
                {/* Student name header */}
                <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-gray-100 bg-emerald-50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addSession(s.studentId)}
                    className="text-xs font-medium text-[#0F1C3F] hover:underline"
                  >
                    + session
                  </button>
                </div>

                {/* Sessions */}
                <div className="flex flex-col divide-y divide-gray-100">
                  {sessions.map((e, idx) => {
                    const duration = e.extended ? 120 : 90;
                    const endTime = e.time ? addMinutes(e.time, duration) : null;
                    const isExisting = !!e.id;
                    const isPendingThisDelete = pendingDelete?.studentId === s.studentId && pendingDelete?.idx === idx;

                    return (
                      <div key={idx} className="p-3 bg-white">
                        {/* Delete confirmation */}
                        {isPendingThisDelete && (
                          <div className="mb-2 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 font-medium">Remove:</span>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteConfirm(false)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50"
                            >
                              This session
                            </button>
                            {e.recurringGroupId && (
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDeleteConfirm(true)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-50"
                              >
                                All recurring
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPendingDelete(null)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Session row header */}
                        <div className="flex items-center gap-2 mb-2">
                          {sessions.length > 1 && (
                            <span className="text-[10px] text-gray-400 font-medium">Session {idx + 1}</span>
                          )}
                          {isExisting && e.recurringGroupId && (
                            <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded">↻ recurring</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleXClick(s.studentId, idx)}
                            className="ml-auto text-gray-300 hover:text-red-400 text-base leading-none"
                          >
                            ×
                          </button>
                        </div>

                        {/* Row 1: Time + Subject + Type */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <input
                            type="time"
                            value={e.time}
                            onChange={(ev) => updateSession(s.studentId, idx, { time: ev.target.value })}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20 bg-white"
                          />
                          <select
                            value={e.subject}
                            onChange={(ev) => updateSession(s.studentId, idx, { subject: ev.target.value })}
                            className="flex-1 min-w-[90px] border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20 bg-white"
                          >
                            <option value="">Subject…</option>
                            {SUBJECTS.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                            <button
                              type="button"
                              onClick={() => updateSession(s.studentId, idx, { lessonType: e.lessonType === "individual" ? "" : "individual" })}
                              className={`px-2.5 py-1 transition-colors ${e.lessonType === "individual" ? "bg-[#0F1C3F] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                            >
                              1:1
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSession(s.studentId, idx, { lessonType: e.lessonType === "group" ? "" : "group" })}
                              className={`px-2.5 py-1 transition-colors border-l border-gray-200 ${e.lessonType === "group" ? "bg-[#0F1C3F] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                            >
                              Group
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Recurring + 120 min on same line */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {e.recurringGroupId ? (
                            <span className="text-[11px] text-gray-400">↻ Part of recurring series</span>
                          ) : (
                            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                              <button
                                type="button"
                                onClick={() => updateSession(s.studentId, idx, { recurring: false })}
                                className={`px-2.5 py-1 transition-colors ${!e.recurring ? "bg-[#0F1C3F] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                              >
                                One time
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSession(s.studentId, idx, { recurring: true })}
                                className={`px-2.5 py-1 transition-colors border-l border-gray-200 ${e.recurring ? "bg-purple-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                              >
                                ↻ Weekly
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => updateSession(s.studentId, idx, { extended: !e.extended })}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${e.extended ? "bg-[#F5A623]" : "bg-gray-200"}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${e.extended ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                            </button>
                            <span className={`text-xs ${e.extended ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                              120 min
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add student to slot */}
          {availableToAdd.length > 0 && (
            <div className="mt-1">
              <select
                value=""
                onChange={(e) => { if (e.target.value) addStudentToSlot(e.target.value); }}
                className="w-full border border-dashed border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20 bg-white hover:border-[#0F1C3F] transition-colors"
              >
                <option value="">+ Add student to this slot…</option>
                {availableToAdd.map((s) => (
                  <option key={s.studentId} value={s.studentId}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-2">
          {onAddStudent && (
            <button
              type="button"
              onClick={onAddStudent}
              className="w-full py-2 rounded-xl text-xs font-medium border border-dashed border-gray-200 text-gray-400 hover:border-[#0F1C3F] hover:text-[#0F1C3F] transition-colors"
            >
              + Add new student to roster
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isPending || !hasEntries}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "#0F1C3F" }}
          >
            {isPending ? "Saving..." : "Save Session"}
          </button>
        </div>
      </div>
    </>
  );
}
