import { COUNTER_ROLES } from "@/lib/auth/roles";
import { requireUser } from "@/server/auth";
import { PosScreen } from "./pos-screen";

export default async function PosPage() {
  await requireUser(COUNTER_ROLES);
  return <PosScreen />;
}
