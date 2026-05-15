"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface Option {
  id: string;
  name: string;
  hint?: string;
}

interface Props {
  label: string;
  placeholder?: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  error?: string;
  emptyHint?: string;
}

function MultiSelect({ label, placeholder, options, value, onChange, disabled, error, emptyHint }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full min-h-[42px] px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white text-left flex flex-wrap items-center gap-1.5 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm">{placeholder ?? `Select ${label.toLowerCase()}...`}</span>
        )}
        {selected.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0B3C5D]/8 text-[#0B3C5D] text-[11px] font-bold rounded-md">
            {s.name}
            <span
              onClick={(e) => remove(e, s.id)}
              className="hover:bg-[#0B3C5D]/15 rounded p-0.5 cursor-pointer"
              role="button"
              aria-label={`Remove ${s.name}`}
            >
              <X size={10} />
            </span>
          </span>
        ))}
        <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}

      {open && !disabled && (
        <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-slate-50 border-none rounded-lg outline-none"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-400 text-center">{emptyHint ?? "No matches"}</p>
            ) : (
              filtered.map((o) => {
                const isSel = value.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-sm hover:bg-slate-50 transition-colors ${isSel ? "bg-[#0B3C5D]/5" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate ${isSel ? "text-[#0B3C5D] font-bold" : "text-slate-700"}`}>{o.name}</p>
                      {o.hint && <p className="text-[10px] text-slate-400 truncate">{o.hint}</p>}
                    </div>
                    {isSel && <Check size={14} className="text-[#0B3C5D] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MultiSelect);
