import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { EmptyState, Panel } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { Button } from "@/components/ui/button";
import { COUNTER_ROLES } from "@/lib/auth/roles";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, SALE_STATUSES } from "@/lib/validators/sale";
import { requireUser, type SessionUser } from "@/server/auth";
import { dateRangeParam, oneOf, pageParam, param, type SearchParams } from "@/server/query";
import { listSales } from "@/server/services/sales";
import { getSettings } from "@/server/settings";
import { SalesTable } from "./sales-table";

const STATUS_LABELS = { completed: "Completed", refunded: "Refunded" } as const;

async function SalesList({ sp, user }: { sp: SearchParams; user: SessionUser }) {
  const [result, settings] = await Promise.all([
    listSales({
      q: param(sp, "q"),
      paymentMethod: oneOf(sp, "paymentMethod", PAYMENT_METHODS),
      status: oneOf(sp, "status", SALE_STATUSES),
      range: dateRangeParam(sp),
      soldBy: user.role === "cashier" ? user.id : undefined,
      page: pageParam(sp),
    }),
    getSettings(),
  ]);
  const filtered = ["q", "paymentMethod", "status", "from", "to"].some((k) => param(sp, k));

  if (result.total === 0) {
    return (
      <Panel>
        {filtered ? (
          <EmptyState message="No sales match these filters." />
        ) : (
          <EmptyState
            message="No sales recorded yet."
            action={
              <Button asChild>
                <Link href="/pos">Make your first sale</Link>
              </Button>
            }
          />
        )}
      </Panel>
    );
  }
  return (
    <Panel>
      <SalesTable result={result} currencySymbol={settings.currencySymbol} />
    </Panel>
  );
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser(COUNTER_ROLES);
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <ListToolbar
        searchPlaceholder="Search invoice no., customer or phone"
        dateRange
        exportHref="/api/sales"
        filters={[
          {
            key: "paymentMethod",
            placeholder: "Any payment",
            width: "w-36",
            options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
          },
          {
            key: "status",
            placeholder: "Any status",
            width: "w-36",
            options: SALE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          },
        ]}
      >
        <Button asChild>
          <Link href="/pos">
            <ShoppingCart className="size-4" />
            New sale
          </Link>
        </Button>
      </ListToolbar>
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={8} />}>
        <SalesList sp={sp} user={user} />
      </Suspense>
    </div>
  );
}
