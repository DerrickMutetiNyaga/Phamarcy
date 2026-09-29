import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { type FilterConfig, ListToolbar } from "@/components/data/list-toolbar";
import { ReportTable } from "@/components/data/report-table";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import {
  EXPIRY_WINDOW_LABELS,
  EXPIRY_WINDOWS,
  PURCHASE_GROUP_LABELS,
  PURCHASE_GROUPS,
  REPORT_LABELS,
  REPORT_TYPES,
  type ReportType,
  SALES_GROUP_LABELS,
  SALES_GROUPS,
} from "@/lib/report-types";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUSES } from "@/lib/validators/purchase";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/validators/sale";
import { requireUser } from "@/server/auth";
import type { SearchParams } from "@/server/query";
import { listCategoryOptions } from "@/server/services/inventory";
import { listSupplierOptions } from "@/server/services/parties";
import { runReport } from "@/server/services/reports";
import { getSettings } from "@/server/settings";

function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

const paymentMethodFilter: FilterConfig = {
  key: "paymentMethod",
  placeholder: "Any payment",
  width: "w-36",
  options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
};

async function toolbarFor(type: ReportType) {
  switch (type) {
    case "sales":
      return {
        dateRange: true,
        filters: [
          {
            key: "group",
            placeholder: "Group",
            defaultValue: "invoice",
            width: "w-44",
            options: SALES_GROUPS.map((g) => ({ value: g, label: SALES_GROUP_LABELS[g] })),
          },
          paymentMethodFilter,
        ],
      };
    case "purchases":
      return {
        dateRange: true,
        filters: [
          {
            key: "group",
            placeholder: "Group",
            defaultValue: "invoice",
            width: "w-36",
            options: PURCHASE_GROUPS.map((g) => ({ value: g, label: PURCHASE_GROUP_LABELS[g] })),
          },
          { key: "supplier", placeholder: "All suppliers", width: "w-44", options: await listSupplierOptions() },
          {
            key: "paymentStatus",
            placeholder: "Any payment status",
            width: "w-40",
            options: PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] })),
          },
        ],
      };
    case "stock":
      return {
        searchPlaceholder: "Search medicine",
        filters: [{ key: "category", placeholder: "All categories", width: "w-44", options: await listCategoryOptions() }],
      };
    case "expiry":
      return {
        searchPlaceholder: "Search medicine or batch",
        filters: [
          {
            key: "window",
            placeholder: "Window",
            defaultValue: "30",
            options: EXPIRY_WINDOWS.map((w) => ({ value: w, label: EXPIRY_WINDOW_LABELS[w] })),
          },
        ],
      };
    case "profit":
      return { dateRange: true, filters: [paymentMethodFilter] };
  }
}

async function Report({ type, sp }: { type: ReportType; sp: SearchParams }) {
  const [report, settings] = await Promise.all([runReport(type, sp), getSettings()]);
  return <ReportTable report={report} currencySymbol={settings.currencySymbol} />;
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireUser(INVENTORY_ROLES);
  const [{ type }, sp] = await Promise.all([params, searchParams]);
  if (!isReportType(type)) notFound();
  const toolbar = await toolbarFor(type);

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-gray-200" aria-label="Reports">
        {REPORT_TYPES.map((t) => (
          <Link
            key={t}
            href={`/reports/${t}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium",
              t === type ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            {REPORT_LABELS[t]}
          </Link>
        ))}
      </nav>
      <ListToolbar key={type} {...toolbar} exportHref={`/api/reports/${type}`} />
      <Suspense key={JSON.stringify({ type, sp })} fallback={<TableSkeleton columns={6} />}>
        <Report type={type} sp={sp} />
      </Suspense>
    </div>
  );
}
