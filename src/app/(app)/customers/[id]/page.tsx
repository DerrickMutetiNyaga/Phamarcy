import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { DetailGrid, EmptyState, Panel, PanelHeader } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { PartyRowActions } from "@/components/party-actions";
import { COUNTER_ROLES } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/validators/sale";
import { requireUser } from "@/server/auth";
import { dateRangeParam, oneOf, pageParam, type SearchParams } from "@/server/query";
import { getCustomer } from "@/server/services/parties";
import { listSales } from "@/server/services/sales";
import { getSettings } from "@/server/settings";
import { SalesTable } from "../../sales/sales-table";

async function CustomerSales({ id, sp, soldBy }: { id: string; sp: SearchParams; soldBy?: string }) {
  const [result, settings] = await Promise.all([
    listSales({
      customer: id,
      soldBy,
      paymentMethod: oneOf(sp, "paymentMethod", PAYMENT_METHODS),
      range: dateRangeParam(sp),
      page: pageParam(sp),
    }),
    getSettings(),
  ]);
  if (result.total === 0) return <EmptyState message="No purchases by this customer for the selected filters." />;
  return <SalesTable result={result} currencySymbol={settings.currencySymbol} showCustomer={false} />;
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser(COUNTER_ROLES);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="space-y-4">
      <Link href="/customers" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-3.5" />
        Customers
      </Link>
      <Panel>
        <PanelHeader
          title={customer.name}
          actions={
            <PartyRowActions
              kind="customer"
              redirectTo="/customers"
              party={{
                _id: id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email ?? "",
                address: customer.address ?? "",
              }}
            />
          }
        />
        <DetailGrid
          items={[
            { label: "Phone", value: customer.phone },
            { label: "Email", value: customer.email || "-" },
            { label: "Address", value: customer.address || "-" },
            { label: "Customer since", value: formatDate(customer.createdAt) },
          ]}
        />
      </Panel>

      <ListToolbar
        dateRange
        filters={[
          {
            key: "paymentMethod",
            placeholder: "Any payment method",
            width: "w-44",
            options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Purchase history"
          description={user.role === "cashier" ? "Showing sales you processed for this customer." : undefined}
        />
        <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={7} rows={5} bare />}>
          <CustomerSales id={id} sp={sp} soldBy={user.role === "cashier" ? user.id : undefined} />
        </Suspense>
      </Panel>
    </div>
  );
}
