"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
  return session;
}

export async function approveUser(userId: string) {
  const session = await assertAdmin();
  await adminDb.collection("users").doc(userId).update({
    status: "active",
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: session.user.id,
  });
  revalidatePath("/admin/users");
}

export async function changeUserRole(userId: string, formData: FormData) {
  await assertAdmin();
  const role = formData.get("role") as string;
  await adminDb.collection("users").doc(userId).update({ role });
  revalidatePath("/admin/users");
}

export async function deactivateUser(userId: string) {
  await assertAdmin();
  await adminDb.collection("users").doc(userId).update({ status: "pending" });
  revalidatePath("/admin/users");
}

export async function updateUserName(userId: string, name: string) {
  await assertAdmin();
  if (!name.trim()) throw new Error("Name cannot be empty");
  await adminDb.collection("users").doc(userId).update({ name: name.trim() });
  revalidatePath("/admin/users");
}
