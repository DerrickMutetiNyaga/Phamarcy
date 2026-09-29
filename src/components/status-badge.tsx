import { Badge } from "@/components/ui/badge";
import { daysUntil } from "@/lib/format";
import type { PrescriptionStatus } from "@/lib/validators/prescription";
import type { PaymentStatus } from "@/lib/validators/purchase";
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type SaleStatus } from "@/lib/validators/sale";

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return status === "completed" ? <Badge variant="success">Completed</Badge> : <Badge variant="danger">Refunded</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid") return <Badge variant="success">Paid</Badge>;
  if (status === "partial") return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="danger">Due</Badge>;
}

export function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
  if (status === "verified") return <Badge variant="success">Verified</Badge>;
  if (status === "rejected") return <Badge variant="danger">Rejected</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

export function PaymentBadge({ method }: { method: PaymentMethod }) {
  if (method === "mpesa")
    return <Badge className="border-mpesa/30 bg-mpesa/10 font-extrabold tracking-tight text-mpesa">M-PESA</Badge>;
  if (method === "card") return <Badge variant="info">{PAYMENT_METHOD_LABELS[method]}</Badge>;
  return <Badge variant="warning">{PAYMENT_METHOD_LABELS[method]}</Badge>;
}

export function RxBadge() {
  return (
    <Badge variant="rx" title="Prescription required">
      Rx
    </Badge>
  );
}

export function StockBadge({ stock, reorderLevel }: { stock: number; reorderLevel: number }) {
  if (stock === 0) return <Badge variant="danger">Out of stock</Badge>;
  if (stock <= reorderLevel) return <Badge variant="warning">Low stock</Badge>;
  return null;
}

export function ExpiryBadge({ expiryDate }: { expiryDate: string | Date }) {
  const days = daysUntil(expiryDate);
  if (days <= 0) return <Badge variant="danger">Expired</Badge>;
  if (days <= 30) return <Badge variant="danger">{days}d left</Badge>;
  if (days <= 90) return <Badge variant="warning">{days}d left</Badge>;
  return null;
}
