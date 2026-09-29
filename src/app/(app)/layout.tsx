import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppProvider } from "@/components/providers/app-context";
import { requireUser } from "@/server/auth";
import { getSettings } from "@/server/settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);

  return (
    <AppProvider user={user} settings={settings}>
      <div className="min-h-screen">
        <Sidebar />
        <div className="pl-60">
          <Topbar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
