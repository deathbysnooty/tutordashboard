import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect, notFound } from "next/navigation";
import { StudentProfile } from "@/app/students/[id]/student-profile";

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/");

  const [studentDoc, tsSnap] = await Promise.all([
    adminDb.collection("students").doc(id).get(),
    adminDb.collection("tutorStudents").where("studentId", "==", id).where("active", "==", true).get(),
  ]);

  if (!studentDoc.exists) notFound();

  const s = studentDoc.data()!;

  const tutorIds = [...new Set(tsSnap.docs.map((d) => d.data().tutorId as string))];
  const tutorDocs = await Promise.all(tutorIds.map((tid) => adminDb.collection("users").doc(tid).get()));
  const tutorNames: Record<string, string> = {};
  for (const doc of tutorDocs) {
    if (doc.exists) tutorNames[doc.id] = doc.data()!.name ?? "Unknown";
  }

  const tutorRates = tsSnap.docs.map((doc) => ({
    tutorStudentId: doc.id,
    tutorName: tutorNames[doc.data().tutorId] ?? "Unknown",
    ratePerLesson: doc.data().ratePerLesson ?? null,
  }));

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
      tutorStudentId={null}
      ratePerLesson={null}
      isAdmin={true}
      userName={session.user.name ?? session.user.email ?? ""}
      hideNav={true}
      backHref="/admin/students"
      tutorRates={tutorRates}
    />
  );
}
