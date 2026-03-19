"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { getSheetsClient, SPREADSHEET_ID } from "@/lib/google-sheets";

const HEADERS = [
  "Student",
  "Subject(s)",
  "Dates (attended)",
  "Rate ($/lesson)",
  "Duration (min)",
  "Type",
  "# Attended",
  "Earnings ($)",
];

type Lesson = {
  id: string;
  tutorId: string;
  studentId: string;
  tutorStudentId: string | null;
  attendanceDate: string;
  status: string;
  extended30Min: boolean;
  rateSnapshot: number | null;
  subject: string | null;
  lessonType: string | null;
};

function formatDates(lessons: { attendanceDate: string; extended30Min: boolean }[]): string {
  // Sort by date, show as "2 Jan, 12 Jan" etc. Append * for 120 min lessons.
  const sorted = [...lessons].sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate));
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return sorted.map((l) => {
    const [, m, day] = l.attendanceDate.split("-");
    const label = `${parseInt(day)} ${months[parseInt(m) - 1]}`;
    return l.extended30Min ? `${label}*` : label;
  }).join(", ");
}

export async function syncToSheet(month?: string): Promise<{ ok: boolean; error?: string; tutorsSync: number }> {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");

  // Resolve target month (default = current)
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [mYear, mMon] = targetMonth.split("-");
  const monthLabel = new Date(parseInt(mYear), parseInt(mMon) - 1, 1)
    .toLocaleString("en", { month: "long", year: "numeric" });

  // 1. Fetch all lessons then filter to target month (exclude scheduled placeholders)
  const lessonsSnap = await adminDb.collection("lessons").get();
  const allLessons: Lesson[] = lessonsSnap.docs.map((d) => ({
    id: d.id,
    tutorId: d.data().tutorId,
    studentId: d.data().studentId,
    attendanceDate: d.data().attendanceDate,
    status: d.data().status,
    tutorStudentId: d.data().tutorStudentId ?? null,
    extended30Min: d.data().extended30Min ?? false,
    rateSnapshot: d.data().rateSnapshot ?? null,
    subject: d.data().subject ?? null,
    lessonType: d.data().lessonType ?? null,
  }));

  // Filter to target month only, exclude scheduled placeholders
  const lessons = allLessons.filter(
    (l) => l.attendanceDate.startsWith(targetMonth) && l.status !== "scheduled"
  );

  // 2. Collect unique IDs
  const studentIds = [...new Set(lessons.map((l) => l.studentId))];
  const tutorIds = [...new Set(lessons.map((l) => l.tutorId))];

  const [studentDocs, tutorDocs, tutorStudentsSnap] = await Promise.all([
    Promise.all(studentIds.map((id) => adminDb.collection("students").doc(id).get())),
    Promise.all(tutorIds.map((id) => adminDb.collection("users").doc(id).get())),
    adminDb.collection("tutorStudents").get(),
  ]);

  const studentNames: Record<string, string> = {};
  for (const doc of studentDocs) {
    if (doc.exists) studentNames[doc.id] = doc.data()!.name ?? "Unknown";
  }

  const tutorNames: Record<string, string> = {};
  for (const doc of tutorDocs) {
    if (doc.exists) tutorNames[doc.id] = doc.data()!.name ?? "Unknown";
  }

  // Current rates from tutorStudents — keyed by "tutorId::studentId"
  const currentRates: Record<string, number> = {};
  for (const doc of tutorStudentsSnap.docs) {
    const data = doc.data();
    if (data.tutorId && data.studentId && data.ratePerLesson != null) {
      currentRates[`${data.tutorId}::${data.studentId}`] = data.ratePerLesson;
    }
  }

  // 3. Group lessons by tutor
  const byTutor: Record<string, Lesson[]> = {};
  for (const l of lessons) {
    if (!byTutor[l.tutorId]) byTutor[l.tutorId] = [];
    byTutor[l.tutorId].push(l);
  }

  // 4. Connect to sheets
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = meta.data.sheets ?? [];
  const existingTitles: Record<string, number> = {};
  for (const s of existingSheets) {
    if (s.properties?.title && s.properties.sheetId != null) {
      existingTitles[s.properties.title] = s.properties.sheetId;
    }
  }

  let tutorsSync = 0;

  for (const [tutorId, tutorLessons] of Object.entries(byTutor)) {
    const tutorName = tutorNames[tutorId] ?? `Tutor_${tutorId.slice(0, 6)}`;
    const tabName = `${tutorName} - ${monthLabel}`;

    // Create tab if needed
    if (!(tabName in existingTitles)) {
      const addResp = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      });
      const newId = addResp.data.replies?.[0]?.addSheet?.properties?.sheetId;
      if (newId != null) existingTitles[tabName] = newId;
    }

    // 5. Group lessons by studentId only — one row per student
    const groups: Record<string, Lesson[]> = {};

    for (const l of tutorLessons) {
      if (!groups[l.studentId]) groups[l.studentId] = [];
      groups[l.studentId].push(l);
    }

    // 6. Build rows
    const rows: (string | number)[][] = [HEADERS];

    // Sort groups by student name
    const sortedGroups = Object.entries(groups).sort(([idA], [idB]) => {
      const nameA = studentNames[idA] ?? "";
      const nameB = studentNames[idB] ?? "";
      return nameA.localeCompare(nameB);
    });

    for (const [studentId, groupLessons] of sortedGroups) {
      // Use the current tutorStudents rate (admin may have updated it)
      const tutorId = groupLessons[0].tutorId;
      const rate = currentRates[`${tutorId}::${studentId}`] ?? 0;

      const attended = groupLessons.filter((l) => l.status === "attended");

      // Unique subjects
      const subjects = [...new Set(groupLessons.map((l) => l.subject).filter(Boolean))];

      // Unique lesson types
      const types = [...new Set(groupLessons.map((l) =>
        l.lessonType === "individual" ? "1:1" : l.lessonType === "group" ? "Group" : null
      ).filter(Boolean))];

      // Attended dates
      const attendedDates = formatDates(attended);

      // Duration: show 90 if all standard, 120 if all extended, "90, 120" if mixed
      const hasStandard = attended.some((l) => !l.extended30Min);
      const hasExtended = attended.some((l) => l.extended30Min);
      const duration = hasStandard && hasExtended ? "90, 120" : hasExtended ? 120 : 90;

      // Earnings: sum per-lesson using the current rate
      const earnings = attended.reduce((sum, l) => {
        return sum + rate * (l.extended30Min ? 4 / 3 : 1);
      }, 0);

      rows.push([
        studentNames[studentId] ?? "Unknown",
        subjects.length > 0 ? subjects.join(", ") : "—",
        attendedDates || "—",
        rate || "—",
        duration,
        types.length > 0 ? types.join(", ") : "—",
        attended.length,
        Math.round(earnings * 100) / 100,
      ]);
    }

    // Add total row + footnote
    const lastDataRow = rows.length; // header is row 1, so last data row = rows.length
    rows.push([
      "", "", "", "", "", "", "Total",
      `=SUM(H2:H${lastDataRow})`,
    ]);
    rows.push(["* = 120 min lesson"]);

    // 7. Clear and write
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A:Z`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });

    // Bold header
    const sheetId = existingTitles[tabName];
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: rows.length - 1, endRowIndex: rows.length },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
        ],
      },
    });

    tutorsSync++;
  }

  return { ok: true, tutorsSync };
}
