import Link from "next/link";
import { Panel } from "@/components/data/panel";
import { Button } from "@/components/ui/button";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { toDateInputValue } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { param, type SearchParams } from "@/server/query";
import { listMedicineOptions } from "@/server/services/inventory";
import { listSupplierOptions } from "@/server/services/parties";
import { PurchaseForm } from "./purchase-form";

export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(INVENTORY_ROLES);
  const [sp, suppliers, medicines] = await Promise.all([searchParams, listSupplierOptions(), listMedicineOptions()]);

  if (suppliers.length === 0 || medicines.length === 0) {
    return (
      <Panel className="max-w-lg px-6 py-8 text-center">
        <p className="text-[13px] text-gray-600">
          {suppliers.length === 0 ? "Add a supplier before recording purchases." : "Add a medicine before recording purchases."}
        </p>
        <Button asChild className="mt-4">
          {suppliers.length === 0 ? (
            <Link href="/suppliers">Add your first supplier</Link>
          ) : (
            <Link href="/inventory/new">Add your first medicine</Link>
          )}
        </Button>
      </Panel>
    );
  }

  const preselected = param(sp, "supplier");
  return (
    <PurchaseForm
      suppliers={suppliers}
      medicines={medicines}
      defaults={{
        supplier: suppliers.some((s) => s.value === preselected) ? preselected : "",
        supplierInvoiceNo: "",
        date: toDateInputValue(new Date()),
        items: [{ medicine: "", batchNo: "", expiryDate: "", quantity: 1, unitCost: 0 }],
        amountPaid: 0,
        notes: "",
      }}
    />
  );
}
