import { Tag, Tags } from "lucide-react";
import Link from "next/link";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { categoryToneMap, DEFAULT_CATEGORY_TONE } from "@/lib/category-tones";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { listCategoriesWithCounts } from "@/server/services/inventory";
import { AddCategoryButton, CategoryRowActions } from "./category-dialogs";

export default async function CategoriesPage() {
  await requireUser(INVENTORY_ROLES);
  const categories = await listCategoriesWithCounts();
  const tones = categoryToneMap(categories.map((c) => c.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-white p-2.5 pl-4 shadow-sm ring-1 ring-slate-200/80">
        <p className="flex items-center gap-2 text-[13px] text-slate-600">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Tags className="size-4" />
          </span>
          <span className="font-semibold text-slate-900">{categories.length}</span> categories
        </p>
        <AddCategoryButton />
      </div>
      <Panel>
        {categories.length === 0 ? (
          <EmptyState message="No categories yet." action={<AddCategoryButton label="Add your first category" />} />
        ) : (
          <Table containerClassName={TABLE_SCROLL}>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Medicines</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={String(c._id)}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2.5 font-semibold text-slate-900">
                      <span className={cn("flex size-7 items-center justify-center rounded-lg", (tones.get(c.name) ?? DEFAULT_CATEGORY_TONE).tile)}>
                        <Tag className="size-3.5" />
                      </span>
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-96 truncate text-slate-600">{c.description || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Link
                      href={`/inventory?category=${String(c._id)}`}
                      className="inline-flex min-w-8 justify-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                    >
                      {c.medicineCount}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-600">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <CategoryRowActions
                      category={{ _id: String(c._id), name: c.name, description: c.description ?? "" }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
