import { SyncClient } from "./sync-client";

export default function SyncPage() {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`;
  return <SyncClient sheetUrl={sheetUrl} />;
}
