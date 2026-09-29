import Link from "next/link";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { Pagination } from "@/components/data/pagination";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { AddPartyButton, PartyRowActions } from "@/components/party-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { pageParam, param, type SearchParams } from "@/server/query";
import { listSuppliers } from "@/server/services/parties";
import { getSettings } from "@/server/settings";

async function SuppliersTable({ sp }: { sp: SearchParams }) {
  const [result, settings] = await Promise.all([listSuppliers(param(sp, "q"), pageParam(sp)), getSettings()]);
  const money = (v: number) => formatMoney(v, settings.currencySymbol);

  if (result.total === 0) {
    return (
      <Panel>
        {param(sp, "q") ? (
          <EmptyState message="No suppliers match this search." />
        ) : (
          <EmptyState message="No suppliers yet." action={<AddPartyButton kind="supplier" label="Add your first supplier" />} />
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <Table containerClassName={TABLE_SCROLL}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Purchases</TableHead>
            <TableHead className="text-right">Total purchased</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((s) => (
            <TableRow key={s._id}>
              <TableCell>
                <Link href={`/suppliers/${s._id}`} className="font-medium hover:text-emerald-700 hover:underline">
                  {s.name}
                </Link>
              </TableCell>
              <TableCell>{s.phone}</TableCell>
              <TableCell className="text-gray-600">{s.email || "-"}</TableCell>
              <TableCell className="max-w-60 truncate text-gray-600">{s.address || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{s.purchaseCount}</TableCell>
              <TableCell className="text-right tabular-nums">{money(s.totalPurchased)}</TableCell>
              <TableCell className={cn("text-right tabular-nums", s.totalDue > 0 && "text-red-600")}>{money(s.totalDue)}</TableCell>
              <TableCell>
                <PartyRowActions kind="supplier" party={s} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </Panel>
  );
}

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(INVENTORY_ROLES);
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <ListToolbar searchPlaceholder="Search name, phone or email" exportHref="/api/suppliers">
        <AddPartyButton kind="supplier" />
      </ListToolbar>
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={8} />}>
        <SuppliersTable sp={sp} />
      </Suspense>
    </div>
  );
}
