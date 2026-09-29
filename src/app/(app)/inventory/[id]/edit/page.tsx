import { notFound } from "next/navigation";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { requireUser } from "@/server/auth";
import { getMedicineDetail, listCategoryOptions } from "@/server/services/inventory";
import { MedicineForm } from "../../medicine-form";

export default async function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(INVENTORY_ROLES);
  const { id } = await params;
  const [detail, categories] = await Promise.all([getMedicineDetail(id), listCategoryOptions()]);
  if (!detail) notFound();
  const m = detail.medicine;

  return (
    <MedicineForm
      medicineId={id}
      categories={categories}
      defaults={{
        name: m.name,
        genericName: m.genericName,
        brand: m.brand ?? "",
        category: String(m.category),
        manufacturer: m.manufacturer ?? "",
        unit: m.unit,
        strength: m.strength ?? "",
        barcode: m.barcode ?? "",
        salePrice: m.salePrice,
        purchasePrice: m.purchasePrice,
        taxPercent: m.taxPercent,
        prescriptionRequired: m.prescriptionRequired,
        reorderLevel: m.reorderLevel,
        imageUrl: m.imageUrl ?? "",
        imagePublicId: m.imagePublicId ?? "",
        isActive: m.isActive,
      }}
    />
  );
}
