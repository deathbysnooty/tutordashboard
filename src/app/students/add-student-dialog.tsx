"use client";

import { useState, useTransition, useRef } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addAndLinkStudent, linkExistingStudent } from "@/app/actions/students";
import { SchoolInput } from "@/components/school-input";

interface SearchResult {
  id: string;
  name: string;
  school: string | null;
}

interface Props {
  onClose: () => void;
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20";

export function AddStudentDialog({ onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [gradSession, setGradSession] = useState<"May" | "November" | "">("");
  const [gradYear, setGradYear] = useState("");
  const [studentWhatsapp, setStudentWhatsapp] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  function handleSearch(q: string) {
    setSearchQuery(q);
    setSelected(null);
    if (q.trim().length < 1) { setResults([]); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const lower = q.trim().toLowerCase();
      const snap = await getDocs(
        query(
          collection(db, "students"),
          where("nameLower", ">=", lower),
          where("nameLower", "<=", lower + "\uf8ff"),
          orderBy("nameLower"),
          limit(8)
        )
      );
      setResults(snap.docs.map((d) => ({ id: d.id, name: d.data().name, school: d.data().school })));
      setSearching(false);
    }, 300);
  }

  function handleSelect(result: SearchResult) {
    setSelected(result);
    setSearchQuery(result.name);
    setResults([]);
  }

  function handleAddNew() {
    setName(searchQuery);
    setShowForm(true);
    setResults([]);
  }

  function handleLinkExisting() {
    if (!selected) return;
    startTransition(async () => {
      await linkExistingStudent(selected.id);
      onClose();
    });
  }

  function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addAndLinkStudent({
        name,
        school,
        graduationSession: (gradSession as "May" | "November") || null,
        graduationYear: gradYear ? parseInt(gradYear) : null,
        studentWhatsapp,
        parentWhatsapp,
        parentEmail: email,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-visible">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Student</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {!showForm ? (
          <>
            <div className="relative">
              <input
                type="text"
                placeholder="Search student by name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-3 w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              )}

              {results.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-10">
                  {results.map((r) => (
                    <button key={r.id} type="button" onClick={() => handleSelect(r)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-900">{r.name}</p>
                      {r.school && <p className="text-xs text-gray-500">{r.school}</p>}
                    </button>
                  ))}
                  <button type="button" onClick={handleAddNew}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 border-t border-gray-100 transition-colors">
                    <p className="text-sm font-medium text-amber-700">+ Add &quot;{searchQuery}&quot; as new student</p>
                  </button>
                </div>
              )}

              {searchQuery.length > 1 && results.length === 0 && !searching && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-10">
                  <button type="button" onClick={handleAddNew}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors">
                    <p className="text-sm font-medium text-amber-700">+ Add &quot;{searchQuery}&quot; as new student</p>
                  </button>
                </div>
              )}
            </div>

            {selected && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selected.name}</p>
                  {selected.school && <p className="text-xs text-gray-500">{selected.school}</p>}
                </div>
                <button onClick={handleLinkExisting} disabled={isPending}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: "#0F1C3F" }}>
                  {isPending ? "Adding..." : "Add to My Students"}
                </button>
              </div>
            )}

            {!selected && searchQuery.length === 0 && (
              <p className="text-xs text-gray-400 mt-3">Search for an existing student or type a new name to add them.</p>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmitNew} className="flex flex-col gap-4">
            <p className="text-xs text-gray-500 -mt-2">Fill in what you know — incomplete profiles can be updated later.</p>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">School</label>
              <SchoolInput value={school} onChange={setSchool} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">IB Session</label>
                <select value={gradSession} onChange={(e) => setGradSession(e.target.value as "May" | "November" | "")}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  <option value="">—</option>
                  <option value="May">May</option>
                  <option value="November">November</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Year</label>
                <input type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                  placeholder="e.g. 2027" min="2024" max="2035" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Student WhatsApp</label>
              <input value={studentWhatsapp} onChange={(e) => setStudentWhatsapp(e.target.value)}
                placeholder="+6591234567" className={inputCls} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Parent WhatsApp</label>
              <input value={parentWhatsapp} onChange={(e) => setParentWhatsapp(e.target.value)}
                placeholder="+6591234567" className={inputCls} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Parent Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Back
              </button>
              <button type="submit" disabled={isPending || !name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "#0F1C3F" }}>
                {isPending ? "Saving..." : "Add Student"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
