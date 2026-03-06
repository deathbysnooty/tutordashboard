"use client";

import { useState, useRef, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SchoolInput({ value, onChange, placeholder = "e.g. Anglo-Chinese School", className }: Props) {
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all schools once on mount
  useEffect(() => {
    getDocs(collection(db, "schools")).then((snap) => {
      setAllSchools(snap.docs.map((d) => d.data().name as string).filter(Boolean));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(val: string) {
    onChange(val);
    if (val.trim().length < 1) { setSuggestions([]); setOpen(false); return; }
    const lower = val.trim().toLowerCase();
    const matches = allSchools.filter((s) => s.toLowerCase().includes(lower)).slice(0, 6);
    setSuggestions(matches);
    setOpen(matches.length > 0);
  }

  function handleSelect(name: string) {
    onChange(name);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length > 0) {
            const lower = value.trim().toLowerCase();
            const matches = allSchools.filter((s) => s.toLowerCase().includes(lower)).slice(0, 6);
            if (matches.length > 0) { setSuggestions(matches); setOpen(true); }
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => handleSelect(s)}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
