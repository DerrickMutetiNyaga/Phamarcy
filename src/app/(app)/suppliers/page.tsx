import Link from "next/link";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { Pagination } from "@/components/data/pagination";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { InitialsAvatar } from "@/components/initials-avatar";
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
                <Link href={`/suppliers/${s._id}`} className="group inline-flex items-center gap-2.5 font-semibold text-slate-900">
                  <InitialsAvatar name={s.name} className="rounded-lg" />
                  <span className="group-hover:text-emerald-700 group-hover:underline">{s.name}</span>
                </Link>
              </TableCell>
              <TableCell>{s.phone}</TableCell>
              <TableCell className="text-slate-600">{s.email || "-"}</TableCell>
              <TableCell className="max-w-60 truncate text-slate-600">{s.address || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">
                <span className="inline-flex min-w-8 justify-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
                  {s.purchaseCount}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{money(s.totalPurchased)}</TableCell>
              <TableCell className={cn("text-right font-semibold tabular-nums", s.totalDue > 0 ? "text-red-600" : "text-emerald-700")}>
                {money(s.totalDue)}
              </TableCell>
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
