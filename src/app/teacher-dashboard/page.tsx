"use client";

import React, { useEffect, useState } from "react";
import { GraduationCap, BookOpen, Layers, CalendarCheck } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Teacher } from "@/lib/types";

export default function TeacherDashboardPage() {
  const { user, loading } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setTeacher((data as Teacher | null) ?? null);
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="w-10 h-10 border-4 border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
      </div>
    );
  }

  const displayName =
    teacher?.full_name ??
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name?.toString() ??
    "Teacher";

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <div className="bg-[#0B3C5D] text-white w-14 h-14 rounded-2xl flex items-center justify-center">
          <GraduationCap size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#0B3C5D]">Welcome, {displayName}</h1>
          <p className="text-sm text-slate-500">Your teaching workspace</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<BookOpen size={20} className="text-[#0B3C5D]" />}
          label="Assigned Courses"
          value={teacher?.assigned_courses?.length ?? 0}
        />
        <StatCard
          icon={<Layers size={20} className="text-[#0B3C5D]" />}
          label="Assigned Batches"
          value={teacher?.assigned_batches?.length ?? 0}
        />
        <StatCard
          icon={<CalendarCheck size={20} className="text-[#0B3C5D]" />}
          label="Subject"
          value={teacher?.subject_specialization ?? "—"}
        />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-black text-[#0B3C5D] uppercase tracking-wider mb-3">
          Account
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Full name" value={teacher?.full_name ?? displayName} />
          <Field label="Phone" value={teacher?.phone_number ?? "—"} />
          <Field label="Status" value={teacher?.account_status ?? "Active"} />
        </dl>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-[#0B3C5D]/5 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-black text-[#0B3C5D]">{value}</p>
      </div>
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
