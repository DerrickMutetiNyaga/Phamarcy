import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/server/auth";

export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? homeForRole(user.role) : "/login");
}
