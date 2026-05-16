"use client";

import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, Trophy, Lightbulb,
  Activity, Building2, Sparkles,
} from "lucide-react";
import { useAnalyticsData } from "../hooks";
import { Card, EmptyState, formatINR } from "./ui";

type InsightTone = "good" | "warn" | "alert" | "info";

interface Insight {
  id: string;
  tone: InsightTone;
  icon: React.ReactNode;
  title: string;
  body: string;
}

const TONES: Record<InsightTone, { bg: string; border: string; text: string; icon: string }> = {
  good:  { bg: "bg-emerald-50",  border: "border-emerald-200",  text: "text-emerald-800",  icon: "text-emerald-500" },
  warn:  { bg: "bg-amber-50",    border: "border-amber-200",    text: "text-amber-800",    icon: "text-amber-500" },
  alert: { bg: "bg-rose-50",     border: "border-rose-200",     text: "text-rose-800",     icon: "text-rose-500" },
  info:  { bg: "bg-[#0B3C5D]/5", border: "border-[#0B3C5D]/15", text: "text-[#0B3C5D]",    icon: "text-[#0B3C5D]" },
};

function pct(curr: number, prev: number): number {
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export function InsightsPanel() {
  const { data: rows = [], isLoading } = useAnalyticsData();

  const insights = useMemo<Insight[]>(() => {
    if (!rows.length) return [];

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);

    const inRange = (d: Date, from: Date, to: Date) => d >= from && d <= to;

    type Bucket = { sum: number };
    const thisMonthByCat = new Map<string, Bucket & { name: string; color: string }>();
    const prevMonthByCat = new Map<string, Bucket & { name: string; color: string }>();
    const thisMonthByCampus = new Map<string, Bucket & { name: string }>();
    let totalThis = 0, totalPrev = 0;

    for (const e of rows) {
      const d = new Date(e.expense_date);
      const amount = Number(e.amount);
      if (d >= thisMonthStart) {
        totalThis += amount;
        if (e.category) {
          const cur = thisMonthByCat.get(e.category.id) ?? { sum: 0, name: e.category.name, color: e.category.color };
          cur.sum += amount; thisMonthByCat.set(e.category.id, cur);
        }
        const cn = e.campus?.name ?? "Unassigned";
        const cur2 = thisMonthByCampus.get(cn) ?? { sum: 0, name: cn };
        cur2.sum += amount; thisMonthByCampus.set(cn, cur2);
      } else if (inRange(d, prevMonthStart, prevMonthEnd)) {
        totalPrev += amount;
        if (e.category) {
          const cur = prevMonthByCat.get(e.category.id) ?? { sum: 0, name: e.category.name, color: e.category.color };
          cur.sum += amount; prevMonthByCat.set(e.category.id, cur);
        }
      }
    }

    const list: Insight[] = [];

    // 1. Overall month-on-month
    if (totalPrev > 0 || totalThis > 0) {
      const change = pct(totalThis, totalPrev);
      const id = "mom-total";
      if (Math.abs(change) >= 1) {
        list.push({
          id,
          tone: change > 10 ? "warn" : change < -10 ? "good" : "info",
          icon: change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />,
          title: `Total spending ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% vs last month`,
          body: `${formatINR(totalThis)} so far this month, vs ${formatINR(totalPrev)} for the previous month.`,
        });
      }
    }

    // 2. Top spending category this month
    let topCat: { id: string; sum: number; name: string; color: string } | null = null;
    for (const [id, v] of thisMonthByCat.entries()) {
      if (!topCat || v.sum > topCat.sum) topCat = { id, sum: v.sum, name: v.name, color: v.color };
    }
    if (topCat) {
      list.push({
        id: `top-cat-${topCat.id}`,
        tone: "info",
        icon: <Trophy size={16} />,
        title: `${topCat.name} is your biggest spend this month`,
        body: `${formatINR(topCat.sum)} so far — ${totalThis > 0 ? ((topCat.sum / totalThis) * 100).toFixed(1) : 0}% of total spending.`,
      });
    }

    // 3. Category spikes / drops (≥20% change, min ₹500)
    for (const [id, curr] of thisMonthByCat.entries()) {
      const prev = prevMonthByCat.get(id)?.sum ?? 0;
      if (curr.sum < 500 && prev < 500) continue;
      const change = pct(curr.sum, prev);
      if (change >= 20) {
        list.push({
          id: `up-${id}`,
          tone: change >= 50 ? "alert" : "warn",
          icon: <TrendingUp size={16} />,
          title: `${curr.name} expenses up ${change.toFixed(0)}%`,
          body: `Spent ${formatINR(curr.sum)} this month vs ${formatINR(prev)} last month. Worth investigating.`,
        });
      } else if (change <= -20 && prev >= 500) {
        list.push({
          id: `down-${id}`,
          tone: "good",
          icon: <TrendingDown size={16} />,
          title: `${curr.name} expenses down ${Math.abs(change).toFixed(0)}%`,
          body: `Down to ${formatINR(curr.sum)} from ${formatINR(prev)} last month. Nice.`,
        });
      }
    }

    // 4. New category appearing this month
    for (const [id, curr] of thisMonthByCat.entries()) {
      const prev = prevMonthByCat.get(id)?.sum ?? 0;
      if (prev === 0 && curr.sum >= 1000) {
        list.push({
          id: `new-${id}`,
          tone: "warn",
          icon: <Sparkles size={16} />,
          title: `New spending in ${curr.name}`,
          body: `${formatINR(curr.sum)} this month — nothing in this category last month.`,
        });
      }
    }

    // 5. Highest-spend campus this month
    let topCampus: { name: string; sum: number } | null = null;
    let totalCampusThis = 0;
    for (const v of thisMonthByCampus.values()) {
      totalCampusThis += v.sum;
      if (!topCampus || v.sum > topCampus.sum) topCampus = { name: v.name, sum: v.sum };
    }
    if (topCampus && topCampus.name !== "Unassigned" && thisMonthByCampus.size > 1) {
      const share = totalCampusThis > 0 ? (topCampus.sum / totalCampusThis) * 100 : 0;
      list.push({
        id: `top-campus`,
        tone: share >= 60 ? "warn" : "info",
        icon: <Building2 size={16} />,
        title: `${topCampus.name} is your highest-spend campus`,
        body: `${formatINR(topCampus.sum)} this month — ${share.toFixed(1)}% of total campus-tagged spend.`,
      });
    }

    // 6. No expenses logged yet this week — operational nudge
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const lastWeekCount = rows.filter((e) => new Date(e.expense_date) >= weekAgo).length;
    if (lastWeekCount === 0 && rows.length > 0) {
      list.push({
        id: "no-recent",
        tone: "alert",
        icon: <AlertTriangle size={16} />,
        title: "No expenses recorded in the last 7 days",
        body: "Either spending paused, or entries are lagging. Quick check?",
      });
    }

    return list;
  }, [rows]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb size={26} />}
        title="No insights yet"
        hint="Add a few expenses across two months and we'll surface spending trends, spikes, and savings."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-[#D4AF37]" />
        <p className="text-sm font-bold text-slate-800">Smart financial insights</p>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {insights.length} insight{insights.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {insights.map((i) => {
          const tone = TONES[i.tone];
          return (
            <Card key={i.id} className={`p-4 ${tone.bg} ${tone.border}`}>
              <div className="flex items-start gap-3">
                <div className={`${tone.icon} shrink-0 mt-0.5`}>{i.icon}</div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tone.text}`}>{i.title}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{i.body}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2">
        <Activity size={11} />
        Insights are derived from your data — no third-party AI. They update as you log more expenses.
      </div>
    </div>
  );
}
