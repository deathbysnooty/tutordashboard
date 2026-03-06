"use server";

import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { TimetableClient } from "./timetable-client";

export interface TimetableEvent {
  id: string;
  attendanceDate: string;
  startTime: string | null;
  studentName: string;
  tutorId: string;
  tutorName: string;
  subject: string | null;
  lessonType: "group" | "individual" | null;
  extended30Min: boolean;
  status: "attended" | "scheduled";
  recurringGroupId: string | null;
}

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/");

  const { month } = await searchParams;
  const now = new Date();
  const targetMonth =
    month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [mYear, mMon] = targetMonth.split("-").map(Number);
  const lastDay = new Date(mYear, mMon, 0).getDate();
  const start = `${targetMonth}-01`;
  const end = `${targetMonth}-${String(lastDay).padStart(2, "0")}`;

  const snap = await adminDb
    .collection("lessons")
    .where("attendanceDate", ">=", start)
    .where("attendanceDate", "<=", end)
    .get();

  const studentIds = [...new Set(snap.docs.map((d) => d.data().studentId as string))];
  const tutorIds = [...new Set(snap.docs.map((d) => d.data().tutorId as string))];

  const [studentDocs, tutorDocs] = await Promise.all([
    Promise.all(studentIds.map((id) => adminDb.collection("students").doc(id).get())),
    Promise.all(tutorIds.map((id) => adminDb.collection("users").doc(id).get())),
  ]);

  const studentNames: Record<string, string> = {};
  for (const doc of studentDocs) {
    if (doc.exists) studentNames[doc.id] = doc.data()!.name ?? "Unknown";
  }

  const tutorNames: Record<string, string> = {};
  for (const doc of tutorDocs) {
    if (doc.exists) tutorNames[doc.id] = doc.data()!.name ?? "Unknown";
  }

  const events: TimetableEvent[] = snap.docs.map((d) => ({
    id: d.id,
    attendanceDate: d.data().attendanceDate,
    startTime: d.data().startTime ?? null,
    studentName: studentNames[d.data().studentId] ?? "Unknown",
    tutorId: d.data().tutorId,
    tutorName: tutorNames[d.data().tutorId] ?? "Unknown",
    subject: d.data().subject ?? null,
    lessonType: d.data().lessonType ?? null,
    extended30Min: d.data().extended30Min ?? false,
    status: d.data().status as "attended" | "scheduled",
    recurringGroupId: d.data().recurringGroupId ?? null,
  }));

  const tutors = [...new Map(events.map((e) => [e.tutorId, e.tutorName])).entries()].sort(
    ([, a], [, b]) => a.localeCompare(b)
  );

  return <TimetableClient events={events} tutors={tutors} targetMonth={targetMonth} />;
}
