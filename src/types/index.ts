export type UserRole = "admin" | "tutor";
export type UserStatus = "pending" | "active";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  photoUrl: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface Student {
  id: string;
  name: string;
  nameLower: string;
  school: string | null;
  graduationSession: "May" | "November" | null;
  graduationYear: number | null;
  studentWhatsapp: string | null;
  parentWhatsapp: string | null;
  parentEmail: string | null;
  isComplete: boolean;
  createdAt: string;
  createdBy: string;
}

export interface TutorStudent {
  id: string;
  tutorId: string;
  studentId: string;
  ratePerLesson: number | null;
  active: boolean;
  createdAt: string;
}

export interface Lesson {
  id: string;
  studentId: string;
  tutorId: string;
  tutorStudentId: string;
  rateSnapshot: number | null;
  attendanceDate: string; // ISO date e.g. "2026-03-05"
  status: "attended" | "absent";
  extended30Min: boolean;
  extensionFlaggedAt: string | null;
  extensionAcknowledged: boolean;
  loggedAt: string;
  loggedBy: string;
  syncedToSheet: boolean;
}

export const STANDARD_DURATION = 90; // minutes
