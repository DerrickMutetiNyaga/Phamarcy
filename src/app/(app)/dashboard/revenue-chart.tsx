"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMoney } from "@/components/providers/app-context";

export function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  const money = useMoney();
  return (
    <div className="h-64 px-2 pt-4 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2f3ec" strokeDasharray="4 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d1e7de" }} tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={84}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v: number) => money(v).replace(/\.00$/, "")}
          />
          <Tooltip
            cursor={{ fill: "#ecfdf5" }}
            formatter={(value) => [money(Number(value)), "Revenue"]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 10,
              border: "1px solid #a7f3d0",
              boxShadow: "0 8px 24px -8px rgba(6, 78, 59, 0.25)",
            }}
          />
          <Bar dataKey="revenue" fill="url(#revenue-bar)" radius={[6, 6, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
