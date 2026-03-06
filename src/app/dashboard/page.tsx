import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { AppNav } from "@/components/app-nav";
import { DashboardClient } from "./dashboard-client";

interface StudentRow {
  tutorStudentId: string | null;
  studentId: string;
  name: string;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");

  const tutorId = session.user.id;

  const [allStudentsSnap, tsSnap] = await Promise.all([
    adminDb.collection("students").get(),
    adminDb.collection("tutorStudents")
      .where("tutorId", "==", tutorId)
      .where("active", "==", true)
      .get(),
  ]);

  const linkedMap: Record<string, string> = {};
  for (const tsDoc of tsSnap.docs) {
    linkedMap[tsDoc.data().studentId] = tsDoc.id;
  }

  const students: StudentRow[] = allStudentsSnap.docs.map((doc) => ({
    tutorStudentId: linkedMap[doc.id] ?? null,
    studentId: doc.id,
    name: doc.data().name ?? "Unknown",
  }));

  students.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F7F8FA" }}>
      <AppNav
        userName={session.user.name ?? session.user.email ?? ""}
        isAdmin={session.user.role === "admin"}
      />
      <DashboardClient students={students} tutorId={tutorId} />
    </div>
  );
}
