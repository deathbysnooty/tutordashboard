"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getLessonsForMonth, saveAttendance, updateLessonStartTime, updateRecurringSeriesTime, deleteLesson, deleteLessonSeries } from "@/app/actions/lessons";
import { AttendanceDrawer } from "./attendance-drawer";
import { AddStudentDialog } from "@/app/students/add-student-dialog";

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
  students: StudentRow[];
  tutorId: string;
}

const MAX_VISIBLE = 3;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function roundToNearest30(date: Date): string {
  const m = date.getMinutes();
  const rounded = m < 15 ? 0 : m < 45 ? 30 : 60;
  const h = rounded === 60 ? date.getHours() + 1 : date.getHours();
  return `${String(h % 24).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function MonthEventContent({ lessons, scheduledCount, studentMap }: {
  lessons: LessonRecord[];
  scheduledCount: number;
  studentMap: Record<string, string>;
}) {
  const visible = lessons.slice(0, MAX_VISIBLE);
  const overflow = lessons.length - MAX_VISIBLE;

  return (
    <div className="w-full px-1 py-0.5 flex flex-col gap-0.5">
      {visible.map((l) => (
        <div
          key={l.id}
          className="flex items-center gap-1 text-[11px] leading-tight font-medium truncate rounded px-1 py-0.5 bg-emerald-100 text-emerald-800"
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-500" />
          <span className="truncate">{studentMap[l.studentId] ?? "Unknown"}</span>
          {l.extended30Min && <span className="flex-shrink-0 text-[9px] font-bold text-amber-600">120m</span>}
        </div>
      ))}
      {overflow > 0 && <div className="text-[10px] text-gray-400 font-medium px-1">+{overflow} more</div>}
      {scheduledCount > 0 && lessons.length === 0 && (
        <div className="flex items-center gap-1 px-1 py-0.5">
          <span className="text-[10px] text-purple-500 font-medium">↻ {scheduledCount} scheduled</span>
        </div>
      )}
      {scheduledCount > 0 && lessons.length > 0 && (
        <div className="text-[10px] text-purple-400 px-1">↻ {scheduledCount}</div>
      )}
    </div>
  );
}

export function DashboardClient({ students, tutorId }: Props) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const [drawerStartTime, setDrawerStartTime] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [showAddStudent, setShowAddStudent] = useState(false);

  const studentMap: Record<string, string> = {};
  for (const s of students) studentMap[s.studentId] = s.name;

  const loadLessons = useCallback(async (year: number, month: number) => {
    const data = await getLessonsForMonth(year, month);
    setLessons(data);
  }, []);

  useEffect(() => {
    loadLessons(currentYear, currentMonth);
  }, [currentYear, currentMonth, loadLessons]);

  // All lessons by date (for drawer — includes scheduled)
  const allLessonsByDate: Record<string, LessonRecord[]> = {};
  for (const l of lessons) {
    if (!allLessonsByDate[l.attendanceDate]) allLessonsByDate[l.attendanceDate] = [];
    allLessonsByDate[l.attendanceDate].push(l);
  }

  // Calendar events — attended/absent for colored events, scheduled shown as subtle dots
  const markedLessonsByDate: Record<string, LessonRecord[]> = {};
  for (const [date, ls] of Object.entries(allLessonsByDate)) {
    const marked = ls.filter((l) => l.status === "attended");
    if (marked.length > 0) markedLessonsByDate[date] = marked;
  }

  // Month view: one event per date (merge marked + scheduled-only dates)
  const allCalendarDates = new Set([
    ...Object.keys(markedLessonsByDate),
    ...Object.keys(allLessonsByDate).filter((d) =>
      allLessonsByDate[d].some((l) => l.status === "scheduled")
    ),
  ]);
  const monthEvents = [...allCalendarDates].map((date) => ({
    id: date,
    title: "",
    date,
    extendedProps: {
      lessons: markedLessonsByDate[date] ?? [],
      scheduledCount: (allLessonsByDate[date] ?? []).filter((l) => l.status === "scheduled").length,
    },
  }));

  // Day view: one event per lesson positioned by time
  const dayLessons = selectedDate ? (markedLessonsByDate[selectedDate] ?? []) : [];
  const dayEvents = dayLessons
    .filter((l) => l.startTime)
    .map((l) => ({
      id: l.id,
      title: studentMap[l.studentId] ?? "Unknown",
      start: `${l.attendanceDate}T${l.startTime}`,
      end: `${l.attendanceDate}T${addMinutes(l.startTime!, 90)}`,
      backgroundColor: "#059669",
      borderColor: "#047857",
      extendedProps: { lesson: l },
    }));

  function switchToDay(dateStr: string) {
    setSelectedDate(dateStr);
    setViewMode("day");
    const api = calendarRef.current?.getApi();
    api?.gotoDate(dateStr);
    api?.changeView("timeGridDay");
  }

  function switchToMonth() {
    setViewMode("month");
    const api = calendarRef.current?.getApi();
    api?.changeView("dayGridMonth");
  }

  function handleDateClick(info: { dateStr: string; date: Date }) {
    if (viewMode === "month") {
      switchToDay(info.dateStr);
    } else {
      // Clicked empty time slot in day view — open drawer with that time
      const time = roundToNearest30(info.date);
      setDrawerDate(info.dateStr.split("T")[0]);
      setDrawerStartTime(time);
    }
  }

  function handleEventClick(info: { event: { startStr: string; extendedProps: Record<string, unknown> } }) {
    if (viewMode === "month") {
      switchToDay(info.event.startStr);
    } else {
      // Clicked a lesson block in day view
      const lesson = info.event.extendedProps.lesson as LessonRecord;
      setDrawerDate(lesson.attendanceDate);
      setDrawerStartTime(lesson.startTime);
    }
  }

  async function handleEventDrop(info: {
    event: { id: string; start: Date | null; extendedProps: Record<string, unknown> };
    revert: () => void;
  }) {
    if (!info.event.start) { info.revert(); return; }
    const newTime = `${String(info.event.start.getHours()).padStart(2, "0")}:${String(info.event.start.getMinutes()).padStart(2, "0")}`;
    try {
      await updateLessonStartTime(info.event.id, newTime);
      // Also shift all future scheduled lessons in the same recurring series
      const lesson = info.event.extendedProps.lesson as LessonRecord;
      if (lesson?.recurringGroupId) {
        await updateRecurringSeriesTime(lesson.recurringGroupId, newTime);
      }
      await loadLessons(currentYear, currentMonth);
    } catch {
      info.revert();
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    await deleteLesson(lessonId);
    await loadLessons(currentYear, currentMonth);
  }

  async function handleDeleteSeries(recurringGroupId: string, fromDate: string) {
    await deleteLessonSeries(recurringGroupId, fromDate);
    await loadLessons(currentYear, currentMonth);
  }

  async function handleSave(date: string, entries: Parameters<typeof saveAttendance>[1]) {
    await saveAttendance(date, entries);
    await loadLessons(currentYear, currentMonth);
    setDrawerDate(null);
    setDrawerStartTime(null);
  }

  function handleDatesSet(info: { view: { currentStart: Date; type: string } }) {
    const d = info.view.currentStart;
    if (info.view.type === "timeGridDay") {
      // Day view: use the exact date's month
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth() + 1);
    } else {
      // Month view: add 15 days to land in the centre of the displayed month
      const center = new Date(d.getTime() + 15 * 24 * 60 * 60 * 1000);
      setCurrentYear(center.getFullYear());
      setCurrentMonth(center.getMonth() + 1);
    }
  }

  const drawerLessons = drawerDate ? (allLessonsByDate[drawerDate] ?? []) : [];

  const formattedDay = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-SG", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : "";

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
      <style>{`
        .fc .fc-toolbar-title { font-size: 1rem; font-weight: 600; color: #111827; }
        .fc .fc-button { background: #0F1C3F !important; border-color: #0F1C3F !important; font-size: 0.75rem !important; padding: 0.375rem 0.75rem !important; border-radius: 0.5rem !important; }
        .fc .fc-button:hover { opacity: 0.85 !important; }
        .fc .fc-button-active { opacity: 0.7 !important; }
        .fc .fc-daygrid-day:hover { background: #f9fafb; cursor: pointer; }
        .fc .fc-event { border-radius: 6px !important; cursor: pointer; }
        .fc-dayGridMonth-view .fc-event { background: transparent !important; border: none !important; padding: 0 !important; }
        .fc-dayGridMonth-view .fc-event-main { padding: 0 !important; }
        .fc-timeGridDay-view .fc-event { font-size: 0.8rem !important; }
        .fc .fc-col-header-cell-cushion { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
        .fc .fc-daygrid-day-number { font-size: 0.8rem; color: #374151; }
        .fc .fc-day-today { background: #fffbeb !important; }
        .fc td, .fc th { border-color: #f3f4f6 !important; }
        .fc .fc-scrollgrid { border-color: #f3f4f6 !important; border-radius: 1rem; overflow: hidden; }
        .fc .fc-daygrid-event-harness { margin: 1px 2px !important; }
        .fc .fc-timegrid-slot { height: 2.5rem !important; cursor: pointer; }
        .fc .fc-timegrid-slot:hover { background: #f9fafb; }
        .fc .fc-event-title { font-weight: 600; }
        .fc .fc-event-time { font-size: 0.7rem; opacity: 0.85; }
      `}</style>

      {/* Day view header */}
      {viewMode === "day" && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={switchToMonth}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Month view
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-800">{formattedDay}</span>
          <button
            onClick={() => { setDrawerDate(selectedDate); setDrawerStartTime(roundToNearest30(new Date())); }}
            className="ml-auto text-sm font-medium px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: "#0F1C3F" }}
          >
            + Log attendance
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={viewMode === "month" ? monthEvents : dayEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          editable={viewMode === "day"}
          datesSet={handleDatesSet}
          height="auto"
          headerToolbar={viewMode === "month"
            ? { left: "prev,next today", center: "title", right: "" }
            : { left: "", center: "title", right: "" }
          }
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          eventContent={viewMode === "month"
            ? (arg) => (
                <MonthEventContent
                  lessons={arg.event.extendedProps.lessons as LessonRecord[]}
                  scheduledCount={arg.event.extendedProps.scheduledCount as number}
                  studentMap={studentMap}
                />
              )
            : undefined
          }
        />
      </div>

      {/* Day view hint */}
      {viewMode === "day" && dayLessons.filter(l => !l.startTime).length > 0 && (
        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm text-amber-700">
          {dayLessons.filter(l => !l.startTime).length} lesson(s) saved without a start time — click &quot;Log attendance&quot; to add times.
        </div>
      )}

      {viewMode === "day" && dayLessons.length === 0 && (
        <div className="mt-3 text-sm text-gray-400 text-center">
          Click any time slot or &quot;Log attendance&quot; to record lessons for this day.
        </div>
      )}

      {students.length === 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
          No students yet. <a href="/students" className="underline font-medium">Add students</a> to start logging attendance.
        </div>
      )}

      {drawerDate && (
        <AttendanceDrawer
          date={drawerDate}
          startTime={drawerStartTime}
          students={students}
          existingLessons={drawerLessons}
          onSave={handleSave}
          onDeleteLesson={handleDeleteLesson}
          onDeleteSeries={handleDeleteSeries}
          onClose={() => { setDrawerDate(null); setDrawerStartTime(null); }}
          onAddStudent={() => setShowAddStudent(true)}
        />
      )}

      {showAddStudent && (
        <AddStudentDialog
          onClose={() => {
            setShowAddStudent(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
