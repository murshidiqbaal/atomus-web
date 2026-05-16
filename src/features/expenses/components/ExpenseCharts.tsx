"use client";

import React from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { PieChart as PieIcon, BarChart3 } from "lucide-react";
import { ExpenseItem } from "../types";
import { formatINR } from "../utils/storage";

type ChartRow = { name: string; value: number; color: string };

function toRows(items: ExpenseItem[]): ChartRow[] {
  return items
    .filter((i) => i.amount > 0)
    .map((i) => ({ name: i.label, value: i.amount, color: i.color }));
}

export function DistributionPie({ items }: { items: ExpenseItem[] }) {
  const rows = toRows(items);
  const total = rows.reduce((a, b) => a + b.value, 0);

  if (!rows.length) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400">
        <PieIcon size={28} className="mb-2 opacity-50" />
        <p className="text-sm font-semibold">No expenses entered yet</p>
        <p className="text-xs mt-1">Enter amounts to see the distribution.</p>
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            label={({ percent }) =>
              (percent ?? 0) > 0.05 ? `${Math.round((percent ?? 0) * 100)}%` : ""
            }
            labelLine={false}
          >
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => {
              const n = Number(v) || 0;
              return [
                `${formatINR(n)} (${((n / total) * 100).toFixed(1)}%)`,
                "Amount",
              ] as [string, string];
            }}
            contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankingBar({ items }: { items: ExpenseItem[] }) {
  const rows = toRows(items).sort((a, b) => b.value - a.value);

  if (!rows.length) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400">
        <BarChart3 size={28} className="mb-2 opacity-50" />
        <p className="text-sm font-semibold">Nothing to compare</p>
        <p className="text-xs mt-1">Enter at least one expense to see the ranking.</p>
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 6, right: 18, left: 6, bottom: 6 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickFormatter={(v) => formatINR(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#334155" }}
            width={130}
          />
          <Tooltip
            formatter={(v) => [formatINR(Number(v) || 0), "Amount"] as [string, string]}
            contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
            cursor={{ fill: "#f1f5f9" }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
