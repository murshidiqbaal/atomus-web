import React from "react";
import { MessageSquare, AlertTriangle, CheckCircle2, Award } from "lucide-react";
import { FeedbackStats as StatsType } from "../types";

interface FeedbackStatsProps {
  stats: StatsType;
  loading?: boolean;
}

export function FeedbackStats({ stats, loading }: FeedbackStatsProps) {
  const cards = [
    {
      title: "Total Student Reports",
      value: stats.total,
      subtext: "Teacher evaluations logged",
      icon: MessageSquare,
      color: "text-[#0B3C5D]",
      bgColor: "bg-blue-50/80 border-blue-100",
      iconBg: "bg-[#0B3C5D] text-white",
    },
    {
      title: "Need Improvement",
      value: stats.needImprovement,
      subtext: stats.total > 0 ? `${Math.round((stats.needImprovement / stats.total) * 100)}% of total reports` : "0% of total",
      icon: AlertTriangle,
      color: "text-amber-700",
      bgColor: "bg-amber-50/80 border-amber-200",
      iconBg: "bg-amber-500 text-white",
    },
    {
      title: "Normal / Satisfactory",
      value: stats.normal,
      subtext: stats.total > 0 ? `${Math.round((stats.normal / stats.total) * 100)}% meeting expectations` : "0% of total",
      icon: CheckCircle2,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50/80 border-emerald-200",
      iconBg: "bg-emerald-600 text-white",
    },
    {
      title: "Homework Completed",
      value: stats.homeworkCompleted,
      subtext: stats.total > 0 ? `${Math.round((stats.homeworkCompleted / stats.total) * 100)}% completed on time` : "0% completion",
      icon: Award,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50/80 border-indigo-200",
      iconBg: "bg-indigo-600 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${card.bgColor}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </p>
                {loading ? (
                  <div className="h-8 w-20 bg-slate-200 animate-pulse rounded my-1.5" />
                ) : (
                  <h3 className={`text-3xl font-black mt-1 ${card.color}`}>
                    {card.value.toLocaleString()}
                  </h3>
                )}
                <p className="text-xs font-medium text-slate-500 mt-1">{card.subtext}</p>
              </div>

              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${card.iconBg}`}
              >
                <IconComponent size={22} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
