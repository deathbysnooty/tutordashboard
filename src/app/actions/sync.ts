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
  attendanceDate: string;
  status: string;
  extended30Min: boolean;
  rateSnapshot: number | null;
  subject: string | null;
  lessonType: string | null;
};

function formatDates(dates: string[]): string {
  // dates are "YYYY-MM-DD" — sort them, show as "2 Jan, 12 Jan" etc.
  const sorted = [...dates].sort();
  return sorted.map((d) => {
    const [, m, day] = d.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
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

  const [studentDocs, tutorDocs] = await Promise.all([
    Promise.all(studentIds.map((id) => adminDb.collection("students").doc(id).get())),
    Promise.all(tutorIds.map((id) => adminDb.collection("users").doc(id).get())),
  ]);

  const studentNames: Record<string, string> = {};
  for (const doc of studentDocs) {
    if (doc.exists) studentNames[doc.id] = doc.data()!.name ?? "Unknown";
  }

  const tutorNames: Record<string, string> = {};
  for (const doc of tutorDocs) {
    if (doc.exists) tutorNames[doc.id] = doc.data()!.name ?? "Unknown";
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

    // 5. Group lessons by (studentId, rateSnapshot, extended30Min) — separate rows for different durations
    type GroupKey = string;
    const groups: Record<GroupKey, Lesson[]> = {};

    for (const l of tutorLessons) {
      const key = `${l.studentId}::${l.rateSnapshot ?? "null"}::${l.extended30Min}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    }

    // 6. Build rows  (col J = Earnings formula, data starts at row 2)
    const rows: (string | number)[][] = [HEADERS];
    let rowIndex = 2; // spreadsheet row number for first data row

    // Sort groups by student name
    const sortedGroups = Object.entries(groups).sort(([, a], [, b]) => {
      const nameA = studentNames[a[0].studentId] ?? "";
      const nameB = studentNames[b[0].studentId] ?? "";
      return nameA.localeCompare(nameB);
    });

    for (const [, groupLessons] of sortedGroups) {
      const studentId = groupLessons[0].studentId;
      const rate = groupLessons[0].rateSnapshot ?? 0;

      const attended = groupLessons.filter((l) => l.status === "attended");
      const isExtended = groupLessons[0].extended30Min;
      const duration = isExtended ? 120 : 90;

      // Unique subjects
      const subjects = [...new Set(groupLessons.map((l) => l.subject).filter(Boolean))];

      // Unique lesson types
      const types = [...new Set(groupLessons.map((l) =>
        l.lessonType === "individual" ? "1:1" : l.lessonType === "group" ? "Group" : null
      ).filter(Boolean))];

      // Attended dates
      const attendedDates = formatDates(attended.map((l) => l.attendanceDate));

      // Earnings formula: Rate × #Attended × (Duration / 90)
      // 90 min = 1× rate, 120 min = 4/3× rate
      // Columns: A=Student, B=Subjects, C=Dates, D=Rate, E=Duration, F=Type, G=#Attended, H=Earnings
      const earningsFormula = `=D${rowIndex}*G${rowIndex}*(E${rowIndex}/90)`;

      rows.push([
        studentNames[studentId] ?? "Unknown",
        subjects.length > 0 ? subjects.join(", ") : "—",
        attendedDates || "—",
        rate || "—",
        duration,
        types.length > 0 ? types.join(", ") : "—",
        attended.length,
        earningsFormula,
      ]);
      rowIndex++;
    }

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
        requests: [{
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        }],
      },
    });

    tutorsSync++;
  }

  return { ok: true, tutorsSync };
}
