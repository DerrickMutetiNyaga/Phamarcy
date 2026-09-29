import Link from "next/link";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { listCategoriesWithCounts } from "@/server/services/inventory";
import { AddCategoryButton, CategoryRowActions } from "./category-dialogs";

export default async function CategoriesPage() {
  await requireUser(INVENTORY_ROLES);
  const categories = await listCategoriesWithCounts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">{categories.length} categories</p>
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
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="max-w-96 truncate text-gray-600">{c.description || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Link href={`/inventory?category=${String(c._id)}`} className="text-emerald-700 hover:underline">
                      {c.medicineCount}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-600">{formatDate(c.createdAt)}</TableCell>
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
