"use client";

import React, { useEffect, useState } from "react";
import { UserCircle, Users, Phone } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/shared/Skeleton";

interface ParentRow {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  account_status: string | null;
}

interface StudentRow {
  id: string;
  full_name: string;
  roll_number: string | null;
  attendance_percentage: number | null;
  progress_status: string | null;
}

export default function ParentDashboardPage() {
  const { user, loading } = useAuth();
  const [parent, setParent] = useState<ParentRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase
        .from("parents")
        .select("id, full_name, phone_number, email, account_status")
        .eq("id", user.id)
        .maybeSingle();

      const { data: s } = await supabase
        .from("students")
        .select("id, full_name, roll_number, attendance_percentage, progress_status")
        .eq("parent_id", user.id)
        .eq("is_active", true);

      if (cancelled) return;
      setParent((p as ParentRow | null) ?? null);
      setStudents((s as StudentRow[]) ?? []);
      setFetching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || fetching) {
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6 animate-pulse">
        <header className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </header>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const displayName =
    parent?.full_name ??
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name?.toString() ??
    "Parent";

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <div className="bg-[#0B3C5D] text-white w-14 h-14 rounded-2xl flex items-center justify-center">
          <UserCircle size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#0B3C5D]">Welcome, {displayName}</h1>
          <p className="text-sm text-slate-500">Your linked children</p>
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-black text-[#0B3C5D] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Phone size={14} /> Contact details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Phone" value={parent?.phone_number ?? "—"} />
          <Field label="Status" value={parent?.account_status ?? "Active"} />
        </dl>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-black text-[#0B3C5D] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={14} /> Children ({students.length})
        </h2>
        {students.length === 0 ? (
          <p className="text-sm text-slate-500">No children linked to your account yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {students.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{s.full_name}</p>
                  <p className="text-xs text-slate-500">
                    Roll {s.roll_number ?? "—"} · {s.progress_status ?? "Average"}
                  </p>
                </div>
                <span className="text-sm font-black text-[#0B3C5D]">
                  {s.attendance_percentage ?? 0}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</dt>
      <dd className="text-slate-800 font-semibold mt-0.5">{value}</dd>
    </div>
  );
}
