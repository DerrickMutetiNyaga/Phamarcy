import { ADMIN_ONLY } from "@/lib/auth/roles";
import { requireUser } from "@/server/auth";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireUser(ADMIN_ONLY);
  return (
    <div className="space-y-4">
      <SettingsTabs />
      {children}
    </div>
  );
}
