import { ArrowLeft, ImageIcon, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailGrid, EmptyState, Panel, PanelHeader } from "@/components/data/panel";
import { ExpiryBadge, RxBadge, StockBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { daysUntil, formatDate, formatDateTime, formatMoney, round2 } from "@/lib/format";
import { thumbnailUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { UNIT_LABELS } from "@/lib/validators/medicine";
import { ADJUSTMENT_LABELS } from "@/lib/validators/stock";
import { requireUser } from "@/server/auth";
import { getMedicineDetail } from "@/server/services/inventory";
import { getSettings } from "@/server/settings";
import { AdjustStockDialog, DeleteMedicineButton } from "./medicine-actions";

export default async function MedicineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(INVENTORY_ROLES);
  const { id } = await params;
  const [detail, settings] = await Promise.all([getMedicineDetail(id), getSettings()]);
  if (!detail) notFound();
  const { medicine: m, batches, adjustments, sellableStock } = detail;
  const money = (v: number) => formatMoney(v, settings.currencySymbol);
  const totalQty = batches.reduce((s, b) => s + b.quantity, 0);
  const totalValue = round2(batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0));

  return (
    <div className="space-y-4">
      <Link href="/inventory" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-3.5" />
        Medicines
      </Link>

      <Panel>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              {m.imageUrl ? (
                <Image src={thumbnailUrl(m.imageUrl, 96)} alt={m.name} width={48} height={48} className="size-12 object-cover" />
              ) : (
                <ImageIcon className="size-5 text-gray-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  {m.name} {m.strength}
                </h2>
                {m.prescriptionRequired && <RxBadge />}
                {m.isActive ? <Badge variant="success">Active</Badge> : <Badge>Inactive</Badge>}
                <StockBadge stock={sellableStock} reorderLevel={m.reorderLevel} />
              </div>
              <p className="text-[13px] text-gray-500">{m.genericName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/inventory/${id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <DeleteMedicineButton id={id} name={m.name} />
          </div>
        </div>
        <DetailGrid
          items={[
            { label: "Category", value: m.categoryName || "-" },
            { label: "Unit", value: UNIT_LABELS[m.unit] },
            { label: "Brand", value: m.brand || "-" },
            { label: "Manufacturer", value: m.manufacturer || "-" },
            { label: "Barcode / SKU", value: <span className="font-mono text-xs">{m.barcode || "-"}</span> },
            { label: "Sale price", value: money(m.salePrice) },
            { label: "Last purchase price", value: money(m.purchasePrice) },
            { label: "Tax", value: `${m.taxPercent}%` },
            { label: "Sellable stock", value: <span className="font-medium">{sellableStock}</span> },
            { label: "Reorder level", value: m.reorderLevel },
            { label: "Prescription", value: m.prescriptionRequired ? "Required" : "Not required" },
            { label: "Last updated", value: formatDateTime(m.updatedAt) },
          ]}
        />
      </Panel>

      <Panel>
        <PanelHeader title="Batches" description="Sales draw from the earliest-expiring batch first. Expired batches are never sold." />
        {batches.length === 0 ? (
          <EmptyState
            message="No batches received yet."
            action={
              <Button asChild>
                <Link href="/purchases/new">Add your first purchase</Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch no.</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">Value at cost</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const expired = daysUntil(b.expiryDate) <= 0;
                return (
                  <TableRow key={String(b._id)} className={cn(expired && b.quantity > 0 && "bg-red-50/50")}>
                    <TableCell className="font-mono text-xs">{b.batchNo}</TableCell>
                    <TableCell>
                      <span className="mr-2">{formatDate(b.expiryDate)}</span>
                      {b.quantity > 0 && <ExpiryBadge expiryDate={b.expiryDate} />}
                    </TableCell>
                    <TableCell className="text-gray-600">{formatDate(b.createdAt)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", b.quantity === 0 && "text-gray-400")}>{b.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(b.purchasePrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(round2(b.quantity * b.purchasePrice))}</TableCell>
                    <TableCell className="text-right">
                      <AdjustStockDialog
                        batch={{
                          _id: String(b._id),
                          batchNo: b.batchNo,
                          quantity: b.quantity,
                          expiryDate: new Date(b.expiryDate).toISOString(),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3}>Total ({batches.length} batches, including expired)</TableCell>
                <TableCell className="text-right tabular-nums">{totalQty}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{money(totalValue)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Stock adjustments" description="Most recent 50" />
        {adjustments.length === 0 ? (
          <EmptyState message="No manual adjustments recorded." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.map((a) => (
                <TableRow key={String(a._id)}>
                  <TableCell className="text-gray-600">{formatDateTime(a.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{a.batchNo}</TableCell>
                  <TableCell>{ADJUSTMENT_LABELS[a.type]}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", a.change < 0 ? "text-red-600" : "text-emerald-700")}>
                    {a.change > 0 ? `+${a.change}` : a.change}
                  </TableCell>
                  <TableCell className="max-w-80 truncate whitespace-normal">{a.reason}</TableCell>
                  <TableCell className="text-gray-600">{a.userName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
