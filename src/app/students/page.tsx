"use server";

import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { StudentsClient } from "./students-client";

interface StudentRow {
  tutorStudentId: string | null;
  studentId: string;
  name: string;
  school: string | null;
  graduationSession: "May" | "November" | null;
  graduationYear: number | null;
  isComplete: boolean;
  ratePerLesson: number | null;
}

export default async function StudentsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const tutorId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? "";

  // Fetch all students + this tutor's links in parallel
  const [allStudentsSnap, tsSnap] = await Promise.all([
    adminDb.collection("students").get(),
    adminDb.collection("tutorStudents")
      .where("tutorId", "==", tutorId)
      .where("active", "==", true)
      .get(),
  ]);

  // Map studentId → tutor link
  const linkedMap: Record<string, { tutorStudentId: string; ratePerLesson: number | null }> = {};
  for (const tsDoc of tsSnap.docs) {
    const d = tsDoc.data();
    linkedMap[d.studentId] = { tutorStudentId: tsDoc.id, ratePerLesson: d.ratePerLesson ?? null };
  }

  const rows: StudentRow[] = allStudentsSnap.docs.map((doc) => {
    const s = doc.data();
    const link = linkedMap[doc.id] ?? null;
    return {
      tutorStudentId: link?.tutorStudentId ?? null,
      studentId: doc.id,
      name: s.name ?? "Unknown",
      school: s.school ?? null,
      graduationSession: s.graduationSession ?? null,
      graduationYear: s.graduationYear ?? null,
      isComplete: s.isComplete ?? false,
      ratePerLesson: link?.ratePerLesson ?? null,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name));

  return <StudentsClient students={rows} isAdmin={session.user.role === "admin"} userName={userName} />;
}
