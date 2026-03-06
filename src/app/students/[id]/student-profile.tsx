"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateStudentProfile, updateStudentRate } from "@/app/actions/students";
import { AppNav } from "@/components/app-nav";
import { SchoolInput } from "@/components/school-input";

interface Student {
  id: string;
  name: string;
  school: string | null;
  graduationSession: "May" | "November" | null;
  graduationYear: number | null;
  studentWhatsapp: string | null;
  parentWhatsapp: string | null;
  parentEmail: string | null;
  isComplete: boolean;
}

interface TutorRateEntry {
  tutorStudentId: string;
  tutorName: string;
  ratePerLesson: number | null;
}

interface Props {
  student: Student;
  tutorStudentId: string | null;
  ratePerLesson: number | null;
  isAdmin: boolean;
  userName: string;
  hideNav?: boolean;
  backHref?: string;
  tutorRates?: TutorRateEntry[];
}

function RateEditor({ tutorStudentId, tutorName, initial }: TutorRateEntry) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(initial?.toString() ?? "");
  const [current, setCurrent] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsed = input.trim() ? parseInt(input) : null;
    startTransition(async () => {
      await updateStudentRate(tutorStudentId, parsed);
      setCurrent(parsed);
      setEditing(false);
    });
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{tutorName}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
            <input
              type="number" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="0" min="0" autoFocus
              className="w-24 border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
            />
          </div>
          <button onClick={handleSave} disabled={isPending}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
            style={{ backgroundColor: "#0F1C3F" }}>
            {isPending ? "…" : "Save"}
          </button>
          <button onClick={() => { setInput(current?.toString() ?? ""); setEditing(false); }}
            className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">
            {current != null ? `$${current}` : <span className="text-gray-400 font-normal">Not set</span>}
          </span>
          <button onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-[#0F1C3F] underline">Edit</button>
        </div>
      )}
    </div>
  );
}


const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20";

function WaLink({ number }: { number: string }) {
  return (
    <a href={`https://wa.me/${number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
      className="text-blue-600 hover:underline">{number}</a>
  );
}

export function StudentProfile({ student, tutorStudentId, ratePerLesson, isAdmin, userName, hideNav = false, backHref = "/students", tutorRates }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(student.name);
  const [school, setSchool] = useState(student.school ?? "");
  const [gradSession, setGradSession] = useState<"May" | "November" | "">(student.graduationSession ?? "");
  const [gradYear, setGradYear] = useState(student.graduationYear?.toString() ?? "");
  const [studentWhatsapp, setStudentWhatsapp] = useState(student.studentWhatsapp ?? "");
  const [parentWhatsapp, setParentWhatsapp] = useState(student.parentWhatsapp ?? "");
  const [email, setEmail] = useState(student.parentEmail ?? "");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateStudentProfile(student.id, {
        name, school,
        graduationSession: (gradSession as "May" | "November") || null,
        graduationYear: gradYear ? parseInt(gradYear) : null,
        studentWhatsapp,
        parentWhatsapp,
        parentEmail: email,
      });
      setEditing(false);
    });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F7F8FA" }}>
      {!hideNav && <AppNav userName={userName} isAdmin={isAdmin} />}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href={backHref} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{student.name}</h1>
            {student.school && <p className="text-sm text-gray-400">{student.school}</p>}
          </div>
          <div className="ml-auto">
            {student.isComplete ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Incomplete
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Profile</h2>
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">School</label>
                <SchoolInput value={school} onChange={setSchool} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">IB Session</label>
                  <select value={gradSession} onChange={(e) => setGradSession(e.target.value as "May" | "November" | "")}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                    <option value="">—</option>
                    <option value="May">May</option>
                    <option value="November">November</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Year</label>
                  <input type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                    placeholder="e.g. 2027" min="2024" max="2035" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Student WhatsApp</label>
                <input value={studentWhatsapp} onChange={(e) => setStudentWhatsapp(e.target.value)}
                  placeholder="+6591234567" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Parent WhatsApp</label>
                <input value={parentWhatsapp} onChange={(e) => setParentWhatsapp(e.target.value)}
                  placeholder="+6591234567" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Parent Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#0F1C3F" }}>
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">School</dt>
                <dd className="text-sm font-medium text-gray-800">{student.school ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">IB Session</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {student.graduationSession && student.graduationYear
                    ? `${student.graduationSession} ${student.graduationYear}`
                    : student.graduationSession ?? student.graduationYear ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Student WhatsApp</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {student.studentWhatsapp ? <WaLink number={student.studentWhatsapp} /> : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Parent WhatsApp</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {student.parentWhatsapp ? <WaLink number={student.parentWhatsapp} /> : "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-gray-400 mb-0.5">Parent Email</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {student.parentEmail
                    ? <a href={`mailto:${student.parentEmail}`} className="text-blue-600 hover:underline">{student.parentEmail}</a>
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {tutorRates && tutorRates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Rate per Lesson</h2>
            {tutorRates.map((r) => (
              <RateEditor key={r.tutorStudentId} {...r} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
