"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { updateStudentRate, bulkImportStudents } from "@/app/actions/students";
import type { StudentRow } from "./page";

interface RateEditorProps {
  tutorStudentId: string;
  tutorName: string;
  initial: number | null;
}

function RateEditor({ tutorStudentId, tutorName, initial }: RateEditorProps) {
  const router = useRouter();
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
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-gray-500 truncate">{tutorName}</span>
      <span className="text-gray-300 text-xs">·</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0"
              min="0"
              autoFocus
              className="w-20 border border-gray-200 rounded-lg pl-5 pr-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-xs font-medium px-2 py-1 rounded-lg text-white disabled:opacity-50"
            style={{ backgroundColor: "#0F1C3F" }}
          >
            {isPending ? "…" : "Save"}
          </button>
          <button
            onClick={() => { setInput(current?.toString() ?? ""); setEditing(false); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-800">
            {current != null ? `$${current}` : <span className="text-gray-400">No rate</span>}
          </span>
          <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-[#0F1C3F] underline">
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

function BulkImportModal({ onClose, onDone }: { onClose: () => void; onDone: (count: number) => void }) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<number | null>(null);

  const preview = text.split("\n").map((n) => n.trim()).filter(Boolean);

  function handleImport() {
    startTransition(async () => {
      const res = await bulkImportStudents(preview);
      setResult(res.created);
      onDone(res.created);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Bulk Import Students</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <p className="text-sm text-gray-500">
          Paste student names from your Google Sheet — one name per line. Only names are imported; tutors can fill in details later.
        </p>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder={"Alice Tan\nBob Lee\nSarah Wong"}
          rows={10}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20 resize-none font-mono"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {preview.length > 0 ? `${preview.length} name${preview.length !== 1 ? "s" : ""} detected` : "No names yet"}
          </span>
          {result !== null && (
            <span className="text-xs font-medium text-emerald-600">✓ {result} students imported</span>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 border border-gray-200"
          >
            Close
          </button>
          <button
            onClick={handleImport}
            disabled={isPending || preview.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "#0F1C3F" }}
          >
            {isPending ? "Importing…" : `Import ${preview.length > 0 ? preview.length : ""} students`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminStudentsClient({ rows }: { rows: StudentRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterSession, setFilterSession] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterTutor, setFilterTutor] = useState("all");
  const [showImport, setShowImport] = useState(false);

  // Derive unique filter options
  const schools = useMemo(() =>
    [...new Set(rows.map((r) => r.school).filter(Boolean) as string[])].sort(),
    [rows]
  );
  const sessions = useMemo(() =>
    [...new Set(rows.map((r) => r.graduationSession).filter(Boolean) as string[])].sort(),
    [rows]
  );
  const years = useMemo(() =>
    [...new Set(rows.map((r) => r.graduationYear).filter(Boolean) as number[])].sort(),
    [rows]
  );
  const tutors = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) for (const t of r.tutors) map.set(t.tutorId, t.tutorName);
    return [...map.entries()].sort(([, a], [, b]) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !(r.school ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSchool !== "all" && r.school !== filterSchool) return false;
    if (filterSession !== "all" && r.graduationSession !== filterSession) return false;
    if (filterYear !== "all" && String(r.graduationYear) !== filterYear) return false;
    if (filterTutor !== "all" && !r.tutors.some((t) => t.tutorId === filterTutor)) return false;
    return true;
  }), [rows, search, filterSchool, filterSession, filterYear, filterTutor]);

  const activeFilters = [filterSchool, filterSession, filterYear, filterTutor].filter((f) => f !== "all").length;

  const selectClass = "border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length !== rows.length ? `${filtered.length} of ${rows.length}` : `${rows.length} total`}
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: "#0F1C3F" }}
        >
          <span className="text-base leading-none">↑</span>
          Bulk Import
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by name or school…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20 w-56"
        />

        {schools.length > 0 && (
          <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className={selectClass}>
            <option value="all">All schools</option>
            {schools.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {sessions.length > 0 && (
          <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className={selectClass}>
            <option value="all">All sessions</option>
            {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {years.length > 0 && (
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectClass}>
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        )}

        {tutors.length > 0 && (
          <select value={filterTutor} onChange={(e) => setFilterTutor(e.target.value)} className={selectClass}>
            <option value="all">All tutors</option>
            {tutors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterSchool("all"); setFilterSession("all"); setFilterYear("all"); setFilterTutor("all"); setSearch(""); }}
            className="px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-600 border border-gray-200"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Student</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3 hidden sm:table-cell">School</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3 hidden md:table-cell">IB Session</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Tutor · Rate</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.studentId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  <a
                    href={`/admin/students/${row.studentId}`}
                    className="text-sm font-medium text-gray-900 hover:text-[#0F1C3F] hover:underline"
                  >
                    {row.name}
                  </a>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell">
                  <span className="text-sm text-gray-500">{row.school ?? "—"}</span>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className="text-sm text-gray-500">
                    {row.graduationSession && row.graduationYear
                      ? `${row.graduationSession} ${row.graduationYear}`
                      : "—"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {row.isComplete ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Incomplete
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {row.tutors.length === 0 ? (
                    <span className="text-xs text-gray-400">No tutor assigned</span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {row.tutors.map((t) => (
                        <RateEditor
                          key={t.tutorStudentId}
                          tutorStudentId={t.tutorStudentId}
                          tutorName={t.tutorName}
                          initial={t.ratePerLesson}
                        />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  {search || activeFilters > 0 ? "No students match your filters" : "No students yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onDone={(count) => { if (count > 0) router.refresh(); }}
        />
      )}
    </div>
  );
}
