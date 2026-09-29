import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { EmptyState, Panel } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { Button } from "@/components/ui/button";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUSES } from "@/lib/validators/purchase";
import { requireUser } from "@/server/auth";
import { dateRangeParam, oneOf, pageParam, param, type SearchParams } from "@/server/query";
import { listSupplierOptions } from "@/server/services/parties";
import { listPurchases } from "@/server/services/purchases";
import { getSettings } from "@/server/settings";
import { PurchasesTable } from "./purchases-table";

async function PurchasesList({ sp }: { sp: SearchParams }) {
  const [result, settings] = await Promise.all([
    listPurchases({
      q: param(sp, "q"),
      supplier: param(sp, "supplier"),
      paymentStatus: oneOf(sp, "paymentStatus", PAYMENT_STATUSES),
      range: dateRangeParam(sp),
      page: pageParam(sp),
    }),
    getSettings(),
  ]);
  const filtered = ["q", "supplier", "paymentStatus", "from", "to"].some((k) => param(sp, k));
  if (result.total === 0) {
    return (
      <Panel>
        {filtered ? (
          <EmptyState message="No purchases match these filters." />
        ) : (
          <EmptyState
            message="No purchases recorded yet."
            action={
              <Button asChild>
                <Link href="/purchases/new">Add your first purchase</Link>
              </Button>
            }
          />
        )}
      </Panel>
    );
  }
  return (
    <Panel>
      <PurchasesTable result={result} currencySymbol={settings.currencySymbol} />
    </Panel>
  );
}

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(INVENTORY_ROLES);
  const [sp, suppliers] = await Promise.all([searchParams, listSupplierOptions()]);
  return (
    <div className="space-y-4">
      <ListToolbar
        searchPlaceholder="Search purchase or supplier invoice no."
        dateRange
        exportHref="/api/purchases"
        filters={[
          { key: "supplier", placeholder: "All suppliers", options: suppliers, width: "w-44" },
          {
            key: "paymentStatus",
            placeholder: "Any payment status",
            width: "w-40",
            options: PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] })),
          },
        ]}
      >
        <Button asChild>
          <Link href="/purchases/new">
            <Plus className="size-4" />
            New purchase
          </Link>
        </Button>
      </ListToolbar>
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={9} />}>
        <PurchasesList sp={sp} />
      </Suspense>
    </div>
  );
}
