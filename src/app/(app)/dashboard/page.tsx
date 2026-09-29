import { CalendarClock, ChartColumn, FileClock, PackageMinus, Receipt, ShoppingBag, Wallet } from "lucide-react";
import Link from "next/link";
import { KpiCard as Stat } from "@/components/data/detail-hero";
import { EmptyState, Panel, PanelHeader } from "@/components/data/panel";
import { PaymentBadge, SaleStatusBadge, StockBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canAccessPage } from "@/lib/auth/access";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { getDashboardData } from "@/server/services/dashboard";
import { getSettings } from "@/server/settings";
import { RevenueChart } from "./revenue-chart";

export default async function DashboardPage() {
  const user = await requireUser(INVENTORY_ROLES);
  const [data, settings] = await Promise.all([getDashboardData(), getSettings()]);
  const money = (v: number) => formatMoney(v, settings.currencySymbol);
  const canOpenSales = canAccessPage(user.role, "/sales");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Sales today"
          value={data.todaySalesCount.toLocaleString("en-US")}
          href={canOpenSales ? "/sales" : undefined}
          icon={Receipt}
          tone="emerald"
          note="Completed invoices"
        />
        <Stat label="Revenue today" value={money(data.todayRevenue)} icon={Wallet} tone="sky" note="Including tax" />
        <Stat
          label="Low stock items"
          value={data.lowStockCount.toLocaleString("en-US")}
          href="/inventory?stock=low"
          icon={PackageMinus}
          tone="amber"
          note="At or below reorder level"
        />
        <Stat
          label="Expiring in 30 days"
          value={data.expiringSoonCount.toLocaleString("en-US")}
          href="/inventory/expiry?window=30"
          icon={CalendarClock}
          tone="rose"
          note="Open the expiry list"
        />
        <Stat
          label="Pending prescriptions"
          value={data.pendingPrescriptions.toLocaleString("en-US")}
          href="/prescriptions?status=pending"
          icon={FileClock}
          tone="violet"
          note="Waiting for review"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Revenue, last 14 days" description="Completed sales including tax" icon={ChartColumn} tone="emerald" />
          <RevenueChart data={data.revenueByDay} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Low stock"
            icon={PackageMinus}
            tone="amber"
            actions={
              <Link href="/inventory?stock=low" className="text-xs text-emerald-700 hover:underline">
                View all
              </Link>
            }
          />
          {data.lowStock.length === 0 ? (
            <EmptyState message="All medicines are above their reorder level." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStock.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="max-w-48 truncate">
                      <Link href={`/inventory/${m._id}`} className="hover:text-emerald-700 hover:underline">
                        {m.name} {m.strength}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="mr-2">
                        <StockBadge stock={m.stock} reorderLevel={m.reorderLevel} />
                      </span>
                      {m.stock}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">{m.reorderLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Recent sales"
          icon={ShoppingBag}
          tone="sky"
          actions={
            canOpenSales ? (
              <Link href="/sales" className="text-xs text-emerald-700 hover:underline">
                View all
              </Link>
            ) : undefined
          }
        />
        {data.recentSales.length === 0 ? (
          <EmptyState message="No sales recorded yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Sold by</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentSales.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">
                    {canOpenSales ? (
                      <Link href={`/sales/${s._id}`} className="text-emerald-700 hover:underline">
                        {s.invoiceNo}
                      </Link>
                    ) : (
                      s.invoiceNo
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">{formatDateTime(s.createdAt)}</TableCell>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell>
                    <PaymentBadge method={s.paymentMethod} />
                  </TableCell>
                  <TableCell className="text-slate-600">{s.soldByName}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.grandTotal)}</TableCell>
                  <TableCell>
                    <SaleStatusBadge status={s.status} />
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
