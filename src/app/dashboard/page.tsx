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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tutor?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const isAdmin = session.user.role === "admin";
  const { tutor } = await searchParams;

  // Admins can view any tutor's dashboard via ?tutor=<id>
  const tutorId = isAdmin && tutor ? tutor : session.user.id;

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

  // Fetch all active tutors for the admin switcher
  let allTutors: { id: string; name: string }[] = [];
  if (isAdmin) {
    const tutorSnap = await adminDb.collection("users").where("status", "==", "active").get();
    allTutors = tutorSnap.docs
      .map((d) => ({ id: d.id, name: d.data().name as string }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F7F8FA" }}>
      <AppNav
        userName={session.user.name ?? session.user.email ?? ""}
        isAdmin={isAdmin}
      />
      <DashboardClient
        students={students}
        tutorId={tutorId}
        isAdminView={isAdmin && tutor !== undefined && tutor !== session.user.id}
        allTutors={isAdmin ? allTutors : undefined}
        viewAsTutorId={tutorId}
      />
    </div>
  );
}
