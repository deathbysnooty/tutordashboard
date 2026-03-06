import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PendingClient } from "./pending-client";

export default async function PendingPage() {
  const session = await auth();

  if (!session) redirect("/");
  if (session.user.status === "active") redirect("/dashboard");

  return (
    <PendingClient
      userId={session.user.id}
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      image={session.user.image ?? ""}
    />
  );
}
