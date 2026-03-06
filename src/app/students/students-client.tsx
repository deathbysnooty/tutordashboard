"use client";

import { useState } from "react";
import Link from "next/link";
import { AddStudentDialog } from "./add-student-dialog";
import { AppNav } from "@/components/app-nav";

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

interface Props {
  students: StudentRow[];
  isAdmin: boolean;
  userName: string;
}

export function StudentsClient({ students, isAdmin, userName }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F7F8FA" }}>
      <AppNav userName={userName} isAdmin={isAdmin} />
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Students</h1>
          <p className="text-sm text-gray-400 mt-0.5">{students.length} student{students.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0F1C3F" }}
        >
          <span className="text-lg leading-none">+</span>
          Add Student
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-1">No students yet</h3>
            <p className="text-sm text-gray-400 mb-5">Add your first student to get started.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: "#0F1C3F" }}
            >
              Add Student
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">School</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">IB Session</th>
                  {isAdmin && (
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Rate</th>
                  )}
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.studentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/students/${s.studentId}`}
                        className="text-sm font-medium text-gray-900 hover:text-[#0F1C3F] transition-colors"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-500">{s.school ?? "—"}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-500">
                        {s.graduationSession && s.graduationYear
                          ? `${s.graduationSession} ${s.graduationYear}`
                          : s.graduationSession || s.graduationYear || "—"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-500">
                          {s.ratePerLesson != null ? `$${s.ratePerLesson}` : "—"}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      {s.isComplete ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Incomplete
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddStudentDialog onClose={() => setShowAdd(false)} />}
    </div>
  );
}
