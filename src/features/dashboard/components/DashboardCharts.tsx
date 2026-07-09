"use client";

import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from "recharts";

export function PerformanceChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
          dy={8}
          tickFormatter={(dateStr) => {
            if (!dateStr) return "";
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
          }}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xl space-y-1">
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase">
                    {data.date ? new Date(data.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                  </p>
                  <p className="text-xs font-bold text-[#0B3C5D]">{data.name}</p>
                  <p className="text-xs font-black text-[#0B3C5D]">
                    Average: <span className="text-emerald-600 font-bold">{data.avg}%</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="avg"
          stroke="#D4AF37"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#perfGrad)"
          dot={{ fill: "#D4AF37", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FeeCollectionChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <BarChart data={data} barGap={4} barCategoryGap={20}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", fontSize: 12 }}
          formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, ""]}
        />
        <Bar dataKey="collected" name="Collected" fill="#0B3C5D" radius={[6, 6, 0, 0]} />
        <Bar dataKey="pending" name="Pending" fill="#D4AF37" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
