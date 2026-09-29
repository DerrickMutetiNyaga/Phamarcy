import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { initialsOf } from "@/components/initials-avatar";
import { cn } from "@/lib/utils";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs ring-1 ring-slate-200 transition-colors hover:bg-emerald-50 hover:text-emerald-800 hover:ring-emerald-200"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}

export function HeroInitials({ name }: { name: string }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-400 text-base font-bold text-emerald-950 ring-4 ring-white/15">
      {initialsOf(name)}
    </span>
  );
}

export function DetailHero({
  icon: Icon,
  media,
  eyebrow,
  title,
  subtitle,
  badges,
  actions,
}: {
  icon?: LucideIcon;
  media?: React.ReactNode;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 px-5 py-4 text-white shadow-md shadow-emerald-900/15">
      <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-teal-300/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {media ??
            (Icon && (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Icon className="size-6 text-emerald-100" />
              </span>
            ))}
          <div className="min-w-0">
            {eyebrow && <p className="text-[11px] font-semibold tracking-wider text-emerald-200/80 uppercase">{eyebrow}</p>}
            <div className="flex flex-wrap items-center gap-2 [&_[data-slot=badge]]:bg-white [&_[data-slot=badge]]:shadow-sm">
              <h2 className="truncate text-lg font-bold">{title}</h2>
              {badges}
            </div>
            {subtitle && <p className="text-[13px] text-emerald-100/80">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export const KPI_TONES = {
  emerald: { card: "from-emerald-50", icon: "bg-emerald-500 shadow-emerald-600/30", value: "text-emerald-950" },
  sky: { card: "from-sky-50", icon: "bg-sky-500 shadow-sky-600/30", value: "text-sky-950" },
  amber: { card: "from-amber-50", icon: "bg-amber-500 shadow-amber-600/30", value: "text-amber-700" },
  rose: { card: "from-rose-50", icon: "bg-rose-500 shadow-rose-600/30", value: "text-rose-700" },
  violet: { card: "from-violet-50", icon: "bg-violet-500 shadow-violet-600/30", value: "text-violet-700" },
  teal: { card: "from-teal-50", icon: "bg-teal-500 shadow-teal-600/30", value: "text-teal-900" },
} as const;

export type KpiTone = keyof typeof KPI_TONES;

export function KpiCard({
  label,
  value,
  href,
  icon: Icon,
  tone,
  note,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  icon: LucideIcon;
  tone: KpiTone;
  note?: string;
}) {
  const t = KPI_TONES[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md", t.icon)}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className={cn("mt-1 text-xl font-bold tracking-tight break-words tabular-nums xl:text-2xl", t.value)}>{value}</p>
      {note && <p className="mt-0.5 truncate text-[11px] text-slate-500">{note}</p>}
    </>
  );
  const className = cn(
    "block rounded-xl border border-slate-200/80 bg-gradient-to-br to-white to-60% px-4 py-3.5 shadow-sm transition-all",
    t.card
  );
  return href ? (
    <Link href={href} className={cn(className, "hover:-translate-y-0.5 hover:shadow-md")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
