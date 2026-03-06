"use client";

import { useState, useTransition } from "react";
import { updateUserName } from "@/app/actions/admin";

interface Props {
  userId: string;
  initialName: string;
  isSelf: boolean;
}

export function NameEditor({ userId, initialName, isSelf }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [current, setCurrent] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim() || name.trim() === current) { setEditing(false); return; }
    startTransition(async () => {
      await updateUserName(userId, name.trim());
      setCurrent(name.trim());
      setEditing(false);
    });
  }

  if (isSelf || !editing) {
    return (
      <div className="flex items-center gap-1.5 group">
        <p className="text-sm font-medium text-gray-900">{current}</p>
        {!isSelf && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-[#0F1C3F] transition-opacity"
          >
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setName(current); setEditing(false); } }}
        className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20 w-40"
      />
      <button
        onClick={handleSave}
        disabled={isPending || !name.trim()}
        className="text-xs font-medium px-2 py-1 rounded-lg text-white disabled:opacity-50"
        style={{ backgroundColor: "#0F1C3F" }}
      >
        {isPending ? "…" : "Save"}
      </button>
      <button onClick={() => { setName(current); setEditing(false); }} className="text-xs text-gray-400 hover:text-gray-600">
        Cancel
      </button>
    </div>
  );
}
