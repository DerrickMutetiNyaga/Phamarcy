"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMoney } from "@/components/providers/app-context";

export function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  const money = useMoney();
  return (
    <div className="h-64 px-2 pt-4 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 11, fill: "#6b7280" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v: number) => money(v).replace(/\.00$/, "")}
          />
          <Tooltip
            cursor={{ fill: "#f9fafb" }}
            formatter={(value) => [money(Number(value)), "Revenue"]}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb", boxShadow: "none" }}
          />
          <Bar dataKey="revenue" fill="#059669" radius={[2, 2, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
