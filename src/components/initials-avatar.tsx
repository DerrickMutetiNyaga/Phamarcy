import { cn } from "@/lib/utils";

const AVATAR_TONES = [
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-indigo-500",
  "from-violet-400 to-fuchsia-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-teal-400 to-cyan-500",
];

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm",
        AVATAR_TONES[sum % AVATAR_TONES.length],
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
