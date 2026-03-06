import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { UserActions } from "./user-actions";
import { NameEditor } from "./name-editor";
import type { AppUser } from "@/types";

interface UserRow extends AppUser {
  createdAtFormatted: string;
}

export default async function UsersPage() {
  const session = await auth();

  const snapshot = await adminDb.collection("users").get();

  const users: UserRow[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.();
    return {
      id: doc.id,
      email: data.email ?? "",
      name: data.name ?? "",
      photoUrl: data.photoUrl ?? "",
      role: data.role ?? "tutor",
      status: data.status ?? "pending",
      createdAt: createdAt?.toISOString() ?? "",
      approvedAt: data.approvedAt?.toDate?.()?.toISOString() ?? null,
      approvedBy: data.approvedBy ?? null,
      createdAtFormatted: createdAt
        ? createdAt.toLocaleDateString("en-SG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—",
    };
  });

  // Sort: pending first, then alphabetically by name
  users.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return a.name.localeCompare(b.name);
  });

  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {users.length} total · {pendingCount} pending approval
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-4 sm:px-6 py-3">
                User
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 sm:px-6 py-3 hidden sm:table-cell">
                Role
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 sm:px-6 py-3 hidden sm:table-cell">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 sm:px-6 py-3 hidden md:table-cell">
                Joined
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 sm:px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={`border-b border-gray-50 last:border-0 ${
                  user.status === "pending" ? "bg-amber-50/50" : ""
                }`}
              >
                {/* User info */}
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <NameEditor
                        userId={user.id}
                        initialName={user.name}
                        isSelf={user.id === session?.user?.id}
                      />
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      user.role === "admin"
                        ? "text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                    style={
                      user.role === "admin"
                        ? { backgroundColor: "#0F1C3F" }
                        : {}
                    }
                  >
                    {user.role === "admin" ? "Admin" : "Tutor"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      user.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {user.status === "active" ? "Active" : "Pending"}
                  </span>
                </td>

                {/* Joined */}
                <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                  <span className="text-sm text-gray-500">
                    {user.createdAtFormatted}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 sm:px-6 py-4">
                  <UserActions
                    userId={user.id}
                    status={user.status}
                    role={user.role}
                    isSelf={user.id === session?.user?.id}
                  />
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  No users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
