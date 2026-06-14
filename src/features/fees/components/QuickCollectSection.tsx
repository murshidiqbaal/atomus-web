"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search, CreditCard, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useFeeStructures, useRecordPayment, useStudentFees } from "../hooks";
import {
  emptyFilters,
  formatINR,
  PAYMENT_METHODS,
  PaymentMethod,
  PaymentTransaction,
  StudentFee,
  todayISO,
} from "../types";
import { Card, EmptyState, fieldCls, Label, StatusPill } from "./ui";
import { Receipt } from "./Receipt";

interface Props {
  onToast: (type: "success" | "error", msg: string) => void;
}

export function QuickCollectSection({ onToast }: Props) {
  const [search, setSearch] = useState("");
  const [structureId, setStructureId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [termStatusFilter, setTermStatusFilter] = useState<"All" | "Unpaid" | "Paid">("Unpaid");

  const filters = useMemo(
    () => ({ ...emptyFilters(), search, fee_structure_id: structureId }),
    [search, structureId],
  );

  const { data: structures = [] } = useFeeStructures({});
  const { data: rows = [], isLoading } = useStudentFees(filters);

  const [selected, setSelected] = useState<StudentFee | null>(null);
  const [receipt, setReceipt] = useState<PaymentTransaction | null>(null);

  // Find the selected structure to determine terms/months and frequency
  const selectedStructure = useMemo(
    () => structures.find((s) => s.id === structureId),
    [structures, structureId]
  );

  const termOptions = useMemo(() => {
    if (!selectedStructure || !Array.isArray(selectedStructure.term_details)) return [];
    return selectedStructure.term_details.map((t) => t.term_name);
  }, [selectedStructure]);

  const isMonthly = selectedStructure?.fee_frequency === "Monthly";
  const subFilterLabel = isMonthly ? "Filter by Month" : "Filter by Term";

  // Filter rows on client side if a term/month filter is chosen
  const filteredRows = useMemo(() => {
    if (!selectedTerm) return rows;
    return rows.filter((row) => {
      const term = row.term_status?.find((t) => t.term_name === selectedTerm);
      if (!term) return false;
      
      const isPaid = term.amount_due > 0 && term.amount_paid >= term.amount_due;
      if (termStatusFilter === "Unpaid") {
        return !isPaid;
      }
      if (termStatusFilter === "Paid") {
        return isPaid;
      }
      return true;
    });
  }, [rows, selectedTerm, termStatusFilter]);

  // Reset selected term when changing structure
  useEffect(() => {
    setSelectedTerm("");
    setTermStatusFilter("Unpaid");
  }, [structureId]);

  // Drop the selection when the search results no longer contain it — the
  // user has narrowed past their old pick. Derived, not effect-driven.
  const visibleSelected = selected && filteredRows.some((r) => r.id === selected.id) ? selected : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Search results */}
      <div className="lg:col-span-2 space-y-3">
        <Card className="p-3 space-y-3">
          <div>
            <Label>Fee structure</Label>
            <select
              value={structureId}
              onChange={(e) => setStructureId(e.target.value)}
              className={fieldCls}
            >
              <option value="">All structures</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? "Untitled"}
                  {s.courses?.name ? ` · ${s.courses.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {structureId && termOptions.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{subFilterLabel}</Label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">{isMonthly ? "All Months" : "All Terms"}</option>
                  {termOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Term Status</Label>
                <select
                  value={termStatusFilter}
                  onChange={(e) => setTermStatusFilter(e.target.value as any)}
                  className={fieldCls}
                  disabled={!selectedTerm}
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="All">All</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <Label>Find student</Label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, admission #, roll #…"
                className={`${fieldCls} pl-9`}
                autoFocus
              />
            </div>
          </div>
        </Card>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-16 animate-pulse" />
            ))
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon={<AlertCircle size={22} />}
              title="No matches"
              hint="Check spelling or admission number."
            />
          ) : (
            filteredRows.slice(0, 100).map((row) => {
              const termObj = selectedTerm ? row.term_status?.find((t) => t.term_name === selectedTerm) : null;
              const statusToDisplay = termObj ? termObj.status : row.payment_status;
              const balanceToDisplay = termObj ? Math.max(0, termObj.amount_due - termObj.amount_paid) : row.balance_amount;
              const balanceLabel = termObj ? `${selectedTerm} Balance` : "Balance";

              return (
                <button
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all
                    ${visibleSelected?.id === row.id
                      ? "bg-[#0B3C5D] text-white border-[#0B3C5D] shadow-md"
                      : "bg-white border-slate-200 hover:border-[#0B3C5D]/40 hover:shadow-sm"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">
                        {row.students?.full_name ?? "—"}
                      </p>
                      <p className={`text-[11px] font-mono truncate ${
                        visibleSelected?.id === row.id ? "text-blue-100" : "text-slate-400"
                      }`}>
                        {row.students?.admission_number ?? "—"} ·{" "}
                        {row.fee_structures?.name ?? row.students?.courses?.name ?? "—"}
                      </p>
                    </div>
                    {visibleSelected?.id !== row.id && <StatusPill status={statusToDisplay} />}
                  </div>
                  <div className={`mt-1.5 text-[11px] font-bold tabular-nums ${
                    visibleSelected?.id === row.id ? "text-blue-100" : "text-slate-500"
                  }`}>
                    {balanceLabel}: {formatINR(balanceToDisplay)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Form */}
      <div className="lg:col-span-3">
        {visibleSelected ? (
          <CollectForm
            row={visibleSelected}
            initialTermName={selectedTerm || "auto"}
            onToast={onToast}
            onPaid={(tx) => {
              setReceipt(tx);
              setSearch("");
              setSelected(null);
            }}
          />
        ) : (
          <EmptyState
            icon={<CreditCard size={26} />}
            title="Pick a student to collect payment"
            hint="The payment form will appear here."
          />
        )}
      </div>

      {receipt && (
        <Receipt
          payment={receipt}
          studentFee={visibleSelected}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}

function CollectForm({
  row, initialTermName, onToast, onPaid,
}: {
  row: StudentFee;
  initialTermName: string;
  onToast: (t: "success" | "error", m: string) => void;
  onPaid: (tx: PaymentTransaction) => void;
}) {
  const record = useRecordPayment();
  const balance = Number(row.balance_amount);

  const [amount, setAmount] = useState(String(Math.min(balance, 5000) || 0));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [date, setDate] = useState(todayISO());
  const [txnId, setTxnId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [termName, setTermName] = useState(initialTermName);

  useEffect(() => {
    setTermName(initialTermName);
    if (initialTermName !== "auto") {
      const termObj = row.term_status?.find((t) => t.term_name === initialTermName);
      if (termObj) {
        const termDue = Math.max(0, termObj.amount_due - termObj.amount_paid);
        setAmount(String(termDue));
        return;
      }
    }
    setAmount(String(Math.min(balance, 5000) || 0));
  }, [row.id, balance, initialTermName]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onToast("error", "Enter a positive amount.");
      return;
    }
    if (amt > balance) {
      onToast("error", `Amount exceeds balance (${formatINR(balance)}).`);
      return;
    }
    record.mutate(
      {
        student_id: row.student_id,
        student_fee_id: row.id,
        amount_paid: amt,
        payment_method: method,
        payment_date: date,
        transaction_id: txnId.trim() || null,
        remarks: remarks.trim() || null,
        term_name: termName === "auto" ? null : termName,
      },
      {
        onSuccess: (tx) => {
          onToast("success", `Recorded ${formatINR(amt)} for ${row.students?.full_name ?? "student"}.`);
          onPaid(tx);
        },
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Payment failed."),
      },
    );
  };

  const fillFull = () => setAmount(String(balance));
  const fillHalf = () => setAmount(String(Math.round(balance / 2)));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Collecting for
          </p>
          <p className="text-base font-black text-slate-800 truncate">
            {row.students?.full_name ?? "—"}
          </p>
          <p className="text-[11px] font-mono text-slate-400">
            {row.students?.admission_number ?? "—"} ·{" "}
            {row.students?.courses?.name ?? "—"} ·{" "}
            {row.students?.campuses?.name ?? "—"}
          </p>
        </div>
        <StatusPill status={row.payment_status} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Pill label="Total" value={formatINR(row.total_fee)} tone="slate" />
        <Pill label="Paid" value={formatINR(row.paid_amount)} tone="emerald" />
        <Pill label="Balance" value={formatINR(row.balance_amount)} tone="rose" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Amount</Label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fillHalf}
                disabled={balance <= 0}
                className="text-[10px] font-bold text-slate-500 px-1.5 py-0.5 rounded-md hover:bg-slate-50 disabled:opacity-40"
              >
                Half
              </button>
              <button
                type="button"
                onClick={fillFull}
                disabled={balance <= 0}
                className="text-[10px] font-bold text-[#0B3C5D] px-1.5 py-0.5 rounded-md hover:bg-blue-50 disabled:opacity-40"
              >
                Full
              </button>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldCls} pl-7 text-base font-black`}
              min="1"
              max={balance}
              required
            />
          </div>
        </div>

        <div>
          <Label>Apply to Term</Label>
          <select
            value={termName}
            onChange={(e) => {
              setTermName(e.target.value);
              if (e.target.value !== "auto") {
                const termObj = row.term_status?.find((t) => t.term_name === e.target.value);
                if (termObj) {
                  const termDue = Math.max(0, termObj.amount_due - termObj.amount_paid);
                  setAmount(String(termDue));
                }
              } else {
                setAmount(String(Math.min(balance, 5000) || 0));
              }
            }}
            className={fieldCls}
          >
            <option value="auto">Auto-allocate (First Due First)</option>
            {row.term_status?.map((t) => (
              <option key={t.term_name} value={t.term_name}>
                {t.term_name} — {formatINR(Math.max(0, t.amount_due - t.amount_paid))} due (Total: {formatINR(t.amount_due)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Method</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className={fieldCls}
            >
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className={fieldCls}
              required
            />
          </div>
        </div>

        <div>
          <Label>Transaction ID (optional)</Label>
          <input
            type="text"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            className={fieldCls}
            placeholder="UPI ref / cheque no. / etc."
          />
        </div>

        <div>
          <Label>Remarks (optional)</Label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className={`${fieldCls} resize-none`}
            rows={2}
            placeholder="e.g. May 2026 instalment"
          />
        </div>

        <button
          type="submit"
          disabled={record.isPending || balance <= 0}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#0B3C5D] text-white py-3 rounded-xl font-black text-sm hover:bg-[#0B3C5D]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {record.isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <CheckCircle2 size={16} />}
          {balance <= 0 ? "No balance due" : "Confirm Payment"}
        </button>
      </form>
    </Card>
  );
}

function Pill({
  label, value, tone,
}: { label: string; value: string; tone: "slate" | "emerald" | "rose" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <div className={`p-2.5 border rounded-xl ${tones[tone]}`}>
      <p className="text-[9px] font-bold uppercase tracking-tight opacity-80">{label}</p>
      <p className="text-sm font-black tabular-nums truncate">{value}</p>
    </div>
  );
}
