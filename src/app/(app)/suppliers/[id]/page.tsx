import { Contact, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, DetailHero, HeroInitials } from "@/components/data/detail-hero";
import { ListToolbar } from "@/components/data/list-toolbar";
import { DetailGrid, EmptyState, Panel, PanelHeader } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { PartyRowActions } from "@/components/party-actions";
import { Button } from "@/components/ui/button";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUSES } from "@/lib/validators/purchase";
import { requireUser } from "@/server/auth";
import { dateRangeParam, oneOf, pageParam, type SearchParams } from "@/server/query";
import { getSupplier } from "@/server/services/parties";
import { listPurchases } from "@/server/services/purchases";
import { getSettings } from "@/server/settings";
import { PurchasesTable } from "../../purchases/purchases-table";

async function SupplierPurchases({ id, sp }: { id: string; sp: SearchParams }) {
  const [result, settings] = await Promise.all([
    listPurchases({
      supplier: id,
      paymentStatus: oneOf(sp, "paymentStatus", PAYMENT_STATUSES),
      range: dateRangeParam(sp),
      page: pageParam(sp),
    }),
    getSettings(),
  ]);
  if (result.total === 0) return <EmptyState message="No purchases from this supplier for the selected filters." />;
  return <PurchasesTable result={result} currencySymbol={settings.currencySymbol} showSupplier={false} />;
}

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireUser(INVENTORY_ROLES);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="space-y-4">
      <BackLink href="/suppliers" label="Suppliers" />
      <DetailHero
        media={<HeroInitials name={supplier.name} />}
        eyebrow="Supplier"
        title={supplier.name}
        subtitle={supplier.phone}
        actions={
          <PartyRowActions
            kind="supplier"
            redirectTo="/suppliers"
            party={{
              _id: id,
              name: supplier.name,
              phone: supplier.phone,
              email: supplier.email ?? "",
              address: supplier.address ?? "",
            }}
          />
        }
      />
      <Panel>
        <PanelHeader title="Contact details" icon={Contact} tone="sky" />
        <DetailGrid
          items={[
            { label: "Phone", value: supplier.phone },
            { label: "Email", value: supplier.email || "-" },
            { label: "Address", value: supplier.address || "-" },
            { label: "Added", value: formatDate(supplier.createdAt) },
          ]}
        />
      </Panel>

      <ListToolbar
        dateRange
        exportHref={`/api/purchases?supplier=${id}`}
        filters={[
          {
            key: "paymentStatus",
            placeholder: "Any payment status",
            width: "w-44",
            options: PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] })),
          },
        ]}
      >
        <Button asChild>
          <Link href={`/purchases/new?supplier=${id}`}>
            <Plus className="size-4" />
            New purchase
          </Link>
        </Button>
      </ListToolbar>

      <Panel>
        <PanelHeader title="Purchase history" icon={Truck} tone="teal" />
        <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={8} rows={5} bare />}>
          <SupplierPurchases id={id} sp={sp} />
        </Suspense>
      </Panel>
    </div>
  );
}
