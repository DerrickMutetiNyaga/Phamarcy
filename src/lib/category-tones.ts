export interface CategoryTone {
  tile: string;
  dot: string;
}

export const CATEGORY_TONES: CategoryTone[] = [
  { tile: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  { tile: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  { tile: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { tile: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  { tile: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
  { tile: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  { tile: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { tile: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
];

export const DEFAULT_CATEGORY_TONE: CategoryTone = { tile: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };

/** Tones are assigned by alphabetical position so neighbouring categories never share a colour. */
export function categoryToneMap(names: string[]): Map<string, CategoryTone> {
  const sorted = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  return new Map(sorted.map((name, i) => [name, CATEGORY_TONES[i % CATEGORY_TONES.length]]));
}
