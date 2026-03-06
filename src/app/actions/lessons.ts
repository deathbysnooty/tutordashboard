"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export interface AttendanceEntry {
  lessonId?: string; // if set, updates that specific lesson doc
  studentId: string;
  tutorStudentId: string | null; // null = no link yet, will be auto-created
  extended30Min: boolean;
  startTime: string | null;
  subject: string | null;
  lessonType: "group" | "individual" | null;
  recurring?: boolean;
}

function addWeeks(dateStr: string, weeks: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + weeks * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function saveAttendance(
  date: string,
  entries: AttendanceEntry[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const tutorId = session.user.id;
  const batch = adminDb.batch();

  // Auto-create tutorStudents links for students not yet linked to this tutor
  const resolvedEntries = await Promise.all(entries.map(async (entry) => {
    if (entry.tutorStudentId) return entry;
    // Check if a link already exists (race condition guard)
    const existing = await adminDb.collection("tutorStudents")
      .where("tutorId", "==", tutorId)
      .where("studentId", "==", entry.studentId)
      .where("active", "==", true)
      .get();
    if (!existing.empty) return { ...entry, tutorStudentId: existing.docs[0].id };
    // Create new link
    const newRef = adminDb.collection("tutorStudents").doc();
    batch.set(newRef, {
      tutorId,
      studentId: entry.studentId,
      ratePerLesson: null,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ...entry, tutorStudentId: newRef.id };
  }));

  const rateSnaps = await Promise.all(
    resolvedEntries.map((e) => adminDb.collection("tutorStudents").doc(e.tutorStudentId!).get())
  );

  for (let i = 0; i < resolvedEntries.length; i++) {
    const entry = resolvedEntries[i];
    const rateSnapshot = rateSnaps[i].data()?.ratePerLesson ?? null;

    if (entry.lessonId) {
      // Fetch existing lesson to check if it's already recurring
      const existingDoc = await adminDb.collection("lessons").doc(entry.lessonId).get();
      const existingRecurringGroupId = existingDoc.data()?.recurringGroupId ?? null;

      let newRecurringGroupId = existingRecurringGroupId;
      if (!existingRecurringGroupId && entry.recurring) {
        newRecurringGroupId = randomUUID();
      }

      batch.update(adminDb.collection("lessons").doc(entry.lessonId), {
        status: "attended",
        extended30Min: entry.extended30Min,
        startTime: entry.startTime ?? null,
        subject: entry.subject ?? null,
        lessonType: entry.lessonType ?? null,
        rateSnapshot,
        ...(newRecurringGroupId && !existingRecurringGroupId ? { recurringGroupId: newRecurringGroupId } : {}),
        loggedAt: FieldValue.serverTimestamp(),
        loggedBy: tutorId,
        syncedToSheet: false,
      });

      // If converting one-time → recurring, create 25 future attended docs
      if (newRecurringGroupId && !existingRecurringGroupId && existingDoc.data()?.attendanceDate) {
        const lessonDate = existingDoc.data()!.attendanceDate as string;
        for (let week = 1; week <= 25; week++) {
          const futureRef = adminDb.collection("lessons").doc();
          batch.set(futureRef, {
            studentId: entry.studentId,
            tutorId,
            tutorStudentId: entry.tutorStudentId,
            rateSnapshot,
            attendanceDate: addWeeks(lessonDate, week),
            startTime: entry.startTime ?? null,
            subject: entry.subject ?? null,
            lessonType: entry.lessonType ?? null,
            status: "attended",
            extended30Min: false,
            recurringGroupId: newRecurringGroupId,
            loggedAt: FieldValue.serverTimestamp(),
            loggedBy: tutorId,
            syncedToSheet: false,
          });
        }
      }
    } else {
      const recurringGroupId = entry.recurring ? randomUUID() : null;

      const ref = adminDb.collection("lessons").doc();
      batch.set(ref, {
        studentId: entry.studentId,
        tutorId,
        tutorStudentId: entry.tutorStudentId,
        rateSnapshot,
        attendanceDate: date,
        startTime: entry.startTime ?? null,
        subject: entry.subject ?? null,
        lessonType: entry.lessonType ?? null,
        status: "attended",
        extended30Min: entry.extended30Min,
        recurringGroupId,
        loggedAt: FieldValue.serverTimestamp(),
        loggedBy: tutorId,
        syncedToSheet: false,
      });

      // Create 25 future weekly attended docs
      if (recurringGroupId) {
        for (let week = 1; week <= 25; week++) {
          const futureRef = adminDb.collection("lessons").doc();
          batch.set(futureRef, {
            studentId: entry.studentId,
            tutorId,
            tutorStudentId: entry.tutorStudentId,
            rateSnapshot,
            attendanceDate: addWeeks(date, week),
            startTime: entry.startTime ?? null,
            subject: entry.subject ?? null,
            lessonType: entry.lessonType ?? null,
            status: "attended",
            extended30Min: false,
            recurringGroupId,
            loggedAt: FieldValue.serverTimestamp(),
            loggedBy: tutorId,
            syncedToSheet: false,
          });
        }
      }
    }
  }

  await batch.commit();
  revalidatePath("/dashboard");
}

export async function deleteLesson(lessonId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const doc = await adminDb.collection("lessons").doc(lessonId).get();
  if (!doc.exists || doc.data()?.tutorId !== session.user.id) throw new Error("Not found");

  await adminDb.collection("lessons").doc(lessonId).delete();
  revalidatePath("/dashboard");
}

export async function deleteLessonSeries(recurringGroupId: string, fromDate: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const snap = await adminDb.collection("lessons")
    .where("recurringGroupId", "==", recurringGroupId)
    .get();

  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    if (doc.data().tutorId === session.user.id && doc.data().attendanceDate >= fromDate) {
      batch.delete(doc.ref);
    }
  }
  await batch.commit();
  revalidatePath("/dashboard");
}

export async function getLessonsForMonth(year: number, month: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const snap = await adminDb
    .collection("lessons")
    .where("tutorId", "==", session.user.id)
    .where("attendanceDate", ">=", start)
    .where("attendanceDate", "<=", end)
    .get();

  return snap.docs.map((d) => ({
    id: d.id,
    studentId: d.data().studentId as string,
    tutorStudentId: d.data().tutorStudentId as string,
    attendanceDate: d.data().attendanceDate as string,
    status: d.data().status as "attended" | "scheduled",
    extended30Min: d.data().extended30Min as boolean,
    rateSnapshot: d.data().rateSnapshot as number | null,
    startTime: (d.data().startTime as string | null) ?? null,
    subject: (d.data().subject as string | null) ?? null,
    lessonType: (d.data().lessonType as "group" | "individual" | null) ?? null,
    recurringGroupId: (d.data().recurringGroupId as string | null) ?? null,
  }));
}

export async function updateLessonStartTime(lessonId: string, startTime: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const doc = await adminDb.collection("lessons").doc(lessonId).get();
  if (!doc.exists || doc.data()?.tutorId !== session.user.id) throw new Error("Not found");

  await adminDb.collection("lessons").doc(lessonId).update({ startTime });
}

export async function updateRecurringSeriesTime(recurringGroupId: string, startTime: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Query by recurringGroupId only (auto-indexed), filter scheduled in code
  const snap = await adminDb.collection("lessons")
    .where("recurringGroupId", "==", recurringGroupId)
    .get();

  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    if (doc.data().tutorId === session.user.id && doc.data().status === "scheduled") {
      batch.update(doc.ref, { startTime });
    }
  }
  await batch.commit();
  revalidatePath("/dashboard");
}
