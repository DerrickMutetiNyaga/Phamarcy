import Link from "next/link";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { Pagination } from "@/components/data/pagination";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { AddPartyButton, PartyRowActions } from "@/components/party-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COUNTER_ROLES } from "@/lib/auth/roles";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { pageParam, param, type SearchParams } from "@/server/query";
import { listCustomers } from "@/server/services/parties";
import { getSettings } from "@/server/settings";

async function CustomersTable({ sp }: { sp: SearchParams }) {
  const [result, settings] = await Promise.all([listCustomers(param(sp, "q"), pageParam(sp)), getSettings()]);

  if (result.total === 0) {
    return (
      <Panel>
        {param(sp, "q") ? (
          <EmptyState message="No customers match this search." />
        ) : (
          <EmptyState message="No customers yet." action={<AddPartyButton kind="customer" label="Add your first customer" />} />
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
            <TableHead className="text-right">Visits</TableHead>
            <TableHead className="text-right">Total spent</TableHead>
            <TableHead>Last visit</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((c) => (
            <TableRow key={c._id}>
              <TableCell>
                <Link href={`/customers/${c._id}`} className="font-medium hover:text-emerald-700 hover:underline">
                  {c.name}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">{c.phone}</TableCell>
              <TableCell className="text-gray-600">{c.email || "-"}</TableCell>
              <TableCell className="max-w-60 truncate text-gray-600">{c.address || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{c.visits}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(c.totalSpent, settings.currencySymbol)}</TableCell>
              <TableCell className="text-gray-600">{formatDate(c.lastVisit)}</TableCell>
              <TableCell>
                <PartyRowActions kind="customer" party={c} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </Panel>
  );
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(COUNTER_ROLES);
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <ListToolbar searchPlaceholder="Search phone, name or email" exportHref="/api/customers">
        <AddPartyButton kind="customer" />
      </ListToolbar>
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={8} />}>
        <CustomersTable sp={sp} />
      </Suspense>
    </div>
  );
}
