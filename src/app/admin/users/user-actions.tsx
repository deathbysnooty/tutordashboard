"use client";

import { approveUser, changeUserRole, deactivateUser } from "@/app/actions/admin";
import { useTransition } from "react";

interface Props {
  userId: string;
  status: string;
  role: string;
  isSelf: boolean;
}

export function UserActions({ userId, status, role, isSelf }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {status === "pending" && (
        <form
          action={() =>
            startTransition(async () => {
              await approveUser(userId);
            })
          }
        >
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#16a34a" }}
          >
            Approve
          </button>
        </form>
      )}

      {status === "active" && !isSelf && (
        <form action={changeUserRole.bind(null, userId)}>
          <select
            name="role"
            defaultValue={role}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 cursor-pointer"
          >
            <option value="tutor">Tutor</option>
            <option value="admin">Admin</option>
          </select>
        </form>
      )}

      {status === "active" && !isSelf && (
        <form
          action={() =>
            startTransition(async () => {
              if (confirm("Revoke this user's access?")) {
                await deactivateUser(userId);
              }
            })
          }
        >
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Revoke
          </button>
        </form>
      )}

      {isSelf && (
        <span className="text-xs text-gray-400 italic">you</span>
      )}
    </div>
  );
}
