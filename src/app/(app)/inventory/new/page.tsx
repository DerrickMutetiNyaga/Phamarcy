import Link from "next/link";
import { EmptyState, Panel } from "@/components/data/panel";
import { Button } from "@/components/ui/button";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { requireUser } from "@/server/auth";
import { listCategoryOptions } from "@/server/services/inventory";
import { getSettings } from "@/server/settings";
import { MedicineForm } from "../medicine-form";

export default async function NewMedicinePage() {
  await requireUser(INVENTORY_ROLES);
  const [categories, settings] = await Promise.all([listCategoryOptions(), getSettings()]);

  if (categories.length === 0) {
    return (
      <Panel className="max-w-lg">
        <EmptyState
          message="Create a category before adding medicines."
          action={
            <Button asChild>
              <Link href="/inventory/categories">Add your first category</Link>
            </Button>
          }
        />
      </Panel>
    );
  }

  return (
    <MedicineForm
      categories={categories}
      defaults={{
        name: "",
        genericName: "",
        brand: "",
        category: "",
        manufacturer: "",
        unit: "tablet",
        strength: "",
        barcode: "",
        salePrice: 0,
        purchasePrice: 0,
        taxPercent: 0,
        prescriptionRequired: false,
        reorderLevel: settings.lowStockDefault,
        imageUrl: "",
        imagePublicId: "",
        isActive: true,
      }}
    />
  );
}
