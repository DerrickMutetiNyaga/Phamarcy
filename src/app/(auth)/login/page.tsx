import { Boxes, ReceiptText, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getSettings } from "@/server/settings";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  { icon: ReceiptText, title: "Fast counter sales", text: "Cash, M-Pesa and card checkout with printed invoices." },
  { icon: Boxes, title: "Stock you can trust", text: "Batch tracking, expiry alerts and low stock warnings." },
  { icon: ShieldCheck, title: "Safe dispensing", text: "Prescription-only medicines need a verified prescription." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Logo className="size-10" inverted />
          <span className="text-lg font-semibold">{settings.pharmacyName}</span>
        </div>
        <div className="relative max-w-md space-y-8">
          <div>
            <h2 className="text-3xl leading-tight font-bold">Run your pharmacy from one place.</h2>
            <p className="mt-3 text-emerald-100/80">Point of sale, inventory, purchases, prescriptions and reports for your whole team.</p>
          </div>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-5 text-emerald-300" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-emerald-100/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-emerald-200/60">Staff access only. Contact your administrator for an account.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
            <Logo className="size-12" />
            <p className="text-base font-semibold text-slate-900">{settings.pharmacyName}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white p-7 shadow-xl ring-1 shadow-emerald-900/10 ring-slate-200/80">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
            <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1 mb-6 text-[13px] text-slate-500">Sign in with your staff email and password.</p>
            <LoginForm next={safeNext} />
          </div>
        </div>
      </div>
    </div>
  );
}
