import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-shimmer rounded-lg bg-slate-200 ${className}`} />
  );
}

export function SkeletonText({ className = "", lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className="space-y-2 w-full">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`h-4 ${idx === lines - 1 && lines > 1 ? "w-4/5" : "w-full"} ${className}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 space-y-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-3">
        {/* Table Header */}
        <div className="flex gap-4 pb-2 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-2">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? "w-1/4" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGraph({ height = "h-72" }: { height?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
      <div className={`flex items-end gap-3 ${height} w-full pt-4`}>
        <Skeleton className="h-1/3 flex-1 rounded-t-xl" />
        <Skeleton className="h-2/3 flex-1 rounded-t-xl" />
        <Skeleton className="h-1/2 flex-1 rounded-t-xl" />
        <Skeleton className="h-4/5 flex-1 rounded-t-xl" />
        <Skeleton className="h-3/4 flex-1 rounded-t-xl" />
        <Skeleton className="h-2/5 flex-1 rounded-t-xl" />
        <Skeleton className="h-5/6 flex-1 rounded-t-xl" />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Mockup */}
      <div className="w-[260px] bg-[#0B3C5D] p-5 space-y-6 flex flex-col h-screen shrink-0">
        <div className="flex items-center gap-3 pb-6 border-b border-white/10">
          <Skeleton className="w-10 h-10 rounded-xl bg-white/20" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-2/3 bg-white/20" />
            <Skeleton className="h-3 w-1/3 bg-white/20" />
          </div>
        </div>
        <div className="space-y-4 flex-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Main Area Mockup */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Mockup */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <Skeleton className="h-6 w-8 rounded" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </header>
        {/* Content Mockup */}
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable rows={4} cols={5} />
        </main>
      </div>
    </div>
  );
}
