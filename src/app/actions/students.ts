"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

async function upsertSchool(school: string) {
  if (!school.trim()) return;
  const nameLower = school.trim().toLowerCase();
  await adminDb.collection("schools").doc(nameLower).set(
    { name: school.trim(), nameLower },
    { merge: true }
  );
}

export async function addAndLinkStudent(data: {
  name: string;
  school: string;
  graduationSession: "May" | "November" | null;
  graduationYear: number | null;
  studentWhatsapp: string;
  parentWhatsapp: string;
  parentEmail: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const nameLower = data.name.trim().toLowerCase();
  const isComplete = !!(
    data.name &&
    data.school &&
    data.graduationSession &&
    data.graduationYear &&
    data.parentWhatsapp &&
    data.parentEmail
  );

  const studentRef = adminDb.collection("students").doc();
  const tsRef = adminDb.collection("tutorStudents").doc();

  await Promise.all([
    studentRef.set({
      name: data.name.trim(),
      nameLower,
      school: data.school || null,
      graduationSession: data.graduationSession,
      graduationYear: data.graduationYear,
      studentWhatsapp: data.studentWhatsapp || null,
      parentWhatsapp: data.parentWhatsapp || null,
      parentEmail: data.parentEmail || null,
      isComplete,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: session.user.id,
    }),
    tsRef.set({
      tutorId: session.user.id,
      studentId: studentRef.id,
      ratePerLesson: null,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    }),
    upsertSchool(data.school),
  ]);

  revalidatePath("/students");
}

export async function linkExistingStudent(studentId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const existing = await adminDb
    .collection("tutorStudents")
    .where("tutorId", "==", session.user.id)
    .where("studentId", "==", studentId)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    if (!doc.data().active) {
      await doc.ref.update({ active: true });
    }
    revalidatePath("/students");
    return;
  }

  await adminDb.collection("tutorStudents").doc().set({
    tutorId: session.user.id,
    studentId,
    ratePerLesson: null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  revalidatePath("/students");
}

export async function updateStudentProfile(
  studentId: string,
  data: {
    name: string;
    school: string;
    graduationSession: "May" | "November" | null;
    graduationYear: number | null;
    studentWhatsapp: string;
    parentWhatsapp: string;
    parentEmail: string;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const isComplete = !!(
    data.name &&
    data.school &&
    data.graduationSession &&
    data.graduationYear &&
    data.parentWhatsapp &&
    data.parentEmail
  );

  await Promise.all([
    adminDb.collection("students").doc(studentId).update({
      name: data.name.trim(),
      nameLower: data.name.trim().toLowerCase(),
      school: data.school || null,
      graduationSession: data.graduationSession,
      graduationYear: data.graduationYear,
      studentWhatsapp: data.studentWhatsapp || null,
      parentWhatsapp: data.parentWhatsapp || null,
      parentEmail: data.parentEmail || null,
      isComplete,
    }),
    upsertSchool(data.school),
  ]);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
}

export async function bulkImportStudents(names: string[]) {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");

  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (clean.length === 0) return { created: 0 };

  const batch = adminDb.batch();
  for (const name of clean) {
    const ref = adminDb.collection("students").doc();
    batch.set(ref, {
      name,
      nameLower: name.toLowerCase(),
      school: null,
      graduationSession: null,
      graduationYear: null,
      studentWhatsapp: null,
      parentWhatsapp: null,
      parentEmail: null,
      isComplete: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: session.user.id,
    });
  }
  await batch.commit();
  revalidatePath("/admin/students");
  return { created: clean.length };
}

export async function updateStudentRate(
  tutorStudentId: string,
  ratePerLesson: number | null
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");

  await adminDb
    .collection("tutorStudents")
    .doc(tutorStudentId)
    .update({ ratePerLesson });

  revalidatePath("/students");
  revalidatePath("/admin/students");
}
