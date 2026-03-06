import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminStudentsClient } from "./admin-students-client";

export interface TutorRate {
  tutorStudentId: string;
  tutorId: string;
  tutorName: string;
  ratePerLesson: number | null;
}

export interface StudentRow {
  studentId: string;
  name: string;
  school: string | null;
  graduationSession: "May" | "November" | null;
  graduationYear: number | null;
  isComplete: boolean;
  tutors: TutorRate[];
}

export default async function AdminStudentsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/");

  // Fetch ALL students + all active tutor links in parallel
  const [allStudentsSnap, tsSnap] = await Promise.all([
    adminDb.collection("students").get(),
    adminDb.collection("tutorStudents").where("active", "==", true).get(),
  ]);

  const tutorIds = [...new Set(tsSnap.docs.map((d) => d.data().tutorId as string))];
  const tutorDocs = await Promise.all(
    tutorIds.map((id) => adminDb.collection("users").doc(id).get())
  );

  const tutorMap: Record<string, string> = {};
  for (const doc of tutorDocs) {
    if (doc.exists) tutorMap[doc.id] = doc.data()!.name ?? "Unknown";
  }

  // Build tutor links keyed by studentId
  const tutorsByStudent: Record<string, TutorRate[]> = {};
  for (const tsDoc of tsSnap.docs) {
    const d = tsDoc.data();
    const sid = d.studentId as string;
    if (!tutorsByStudent[sid]) tutorsByStudent[sid] = [];
    tutorsByStudent[sid].push({
      tutorStudentId: tsDoc.id,
      tutorId: d.tutorId,
      tutorName: tutorMap[d.tutorId] ?? "Unknown",
      ratePerLesson: d.ratePerLesson ?? null,
    });
  }

  // Build rows from ALL students
  const rows: StudentRow[] = allStudentsSnap.docs.map((doc) => ({
    studentId: doc.id,
    name: doc.data().name ?? "Unknown",
    school: doc.data().school ?? null,
    graduationSession: doc.data().graduationSession ?? null,
    graduationYear: doc.data().graduationYear ?? null,
    isComplete: doc.data().isComplete ?? false,
    tutors: tutorsByStudent[doc.id] ?? [],
  }));

  rows.sort((a, b) => a.name.localeCompare(b.name));

  return <AdminStudentsClient rows={rows} />;
}
