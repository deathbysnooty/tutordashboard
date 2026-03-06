import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect, notFound } from "next/navigation";
import { StudentProfile } from "./student-profile";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/");

  const [studentDoc, tsSnap] = await Promise.all([
    adminDb.collection("students").doc(id).get(),
    adminDb
      .collection("tutorStudents")
      .where("tutorId", "==", session.user.id)
      .where("studentId", "==", id)
      .where("active", "==", true)
      .get(),
  ]);

  if (!studentDoc.exists) notFound();

  const s = studentDoc.data()!;
  const ts = tsSnap.docs[0] ?? null;

  const student = {
    id,
    name: s.name,
    school: s.school ?? null,
    graduationSession: s.graduationSession ?? null,
    graduationYear: s.graduationYear ?? null,
    studentWhatsapp: s.studentWhatsapp ?? null,
    parentWhatsapp: s.parentWhatsapp ?? null,
    parentEmail: s.parentEmail ?? null,
    isComplete: s.isComplete ?? false,
  };

  return (
    <StudentProfile
      student={student}
      tutorStudentId={ts?.id ?? null}
      ratePerLesson={ts?.data().ratePerLesson ?? null}
      isAdmin={session.user.role === "admin"}
      userName={session.user.name ?? session.user.email ?? ""}
    />
  );
}
