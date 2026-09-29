import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getSettings } from "@/server/settings";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-md border border-gray-200 bg-white p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo className="size-10" />
          <h1 className="text-base font-semibold text-gray-900">{settings.pharmacyName}</h1>
        </div>
        <LoginForm next={safeNext} />
      </div>
    </div>
  );
}
