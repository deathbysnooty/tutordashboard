"use client";

import { useState, useTransition } from "react";
import { syncToSheet } from "@/app/actions/sync";

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -3; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function SyncClient({ sheetUrl }: { sheetUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const [month, setMonth] = useState(currentMonthValue);
  const [result, setResult] = useState<{ ok: boolean; tutorsSync?: number; error?: string } | null>(null);

  const monthOptions = getMonthOptions();

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await syncToSheet(month);
        setResult(res);
      } catch (e) {
        setResult({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
      }
    });
  }

  const selectedLabel = monthOptions.find((o) => o.value === month)?.label ?? month;

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Sync to Google Sheets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Writes one month of attendance to the shared spreadsheet. Each tutor gets a tab named
          <span className="font-medium text-gray-700"> &quot;Name - Month Year&quot;</span>.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
        {/* Sheet link */}
        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700">Photon Academy Attendance</p>
            <p className="text-xs text-gray-400 mt-0.5">Google Sheets</p>
          </div>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-[#0F1C3F] hover:underline"
          >
            Open
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Month selector */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Month to sync</label>
          <select
            value={month}
            onChange={(e) => { setMonth(e.target.value); setResult(null); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0F1C3F]/20 bg-white"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1.5">
            Will create/overwrite tab <span className="font-medium text-gray-600">&quot;Tutor Name - {selectedLabel}&quot;</span> for each tutor with data this month.
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${result.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {result.ok
              ? `Synced ${result.tutorsSync} tutor tab${result.tutorsSync === 1 ? "" : "s"} for ${selectedLabel}.`
              : `Error: ${result.error}`}
          </div>
        )}

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={isPending}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: "#0F1C3F" }}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Syncing…
            </span>
          ) : `Sync ${selectedLabel}`}
        </button>

        <p className="text-xs text-gray-400 text-center -mt-2">
          Overwrites that month&apos;s tab entirely. Other months are untouched.
        </p>
      </div>
    </div>
  );
}
