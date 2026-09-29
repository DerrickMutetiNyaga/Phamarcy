import { getSettings } from "@/server/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsForm initial={settings} />;
}
