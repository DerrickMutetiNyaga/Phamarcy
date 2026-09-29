import { format, startOfDay, subDays } from "date-fns";
import { connectDB } from "@/lib/db";
import { round2 } from "@/lib/format";
import { Sale } from "@/models";
import { countExpiringWithin, countLowStock, listMedicines, type MedicineRow } from "./inventory";
import { countPendingPrescriptions } from "./prescriptions";
import { listSales, type SaleRow } from "./sales";

export interface DashboardData {
  todaySalesCount: number;
  todayRevenue: number;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingPrescriptions: number;
  recentSales: SaleRow[];
  lowStock: MedicineRow[];
  revenueByDay: { date: string; label: string; revenue: number }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  await connectDB();
  const today = startOfDay(new Date());
  const chartStart = subDays(today, 13);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [todayAgg, lowStockCount, expiringSoonCount, pendingPrescriptions, recent, lowStock, daily] = await Promise.all([
    Sale.aggregate<{ count: number; revenue: number }>([
      { $match: { status: "completed", createdAt: { $gte: today } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$grandTotal" } } },
    ]),
    countLowStock(),
    countExpiringWithin(30),
    countPendingPrescriptions(),
    listSales({ page: 1, pageSize: 8 }),
    listMedicines({ stock: "low", status: "active", page: 1, pageSize: 8 }),
    Sale.aggregate<{ _id: string; revenue: number }>([
      { $match: { status: "completed", createdAt: { $gte: chartStart } } },
      {
        $group: {
          _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: tz } },
          revenue: { $sum: "$grandTotal" },
        },
      },
    ]),
  ]);

  const byDay = new Map(daily.map((d) => [d._id, d.revenue]));
  const revenueByDay = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(today, 13 - i);
    const key = format(day, "yyyy-MM-dd");
    return { date: key, label: format(day, "dd MMM"), revenue: round2(byDay.get(key) ?? 0) };
  });

  return {
    todaySalesCount: todayAgg[0]?.count ?? 0,
    todayRevenue: round2(todayAgg[0]?.revenue ?? 0),
    lowStockCount,
    expiringSoonCount,
    pendingPrescriptions,
    recentSales: recent.rows,
    lowStock: lowStock.rows,
    revenueByDay,
  };
}
