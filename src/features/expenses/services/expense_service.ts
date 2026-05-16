import { supabase } from "@/lib/supabase";
import {
  Expense, ExpenseCategory, ExpenseCategoryInput, ExpenseFilters, ExpenseInput, Period,
} from "../types";

const EXPENSE_SELECT = `
  *,
  category:expense_categories(id, name, icon, color),
  campus:campuses(id, name)
`;

// ── Period → date range ─────────────────────────────────────────
export function periodRange(period: Period): { from: string | null; to: string | null } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  switch (period) {
    case "today":
      return { from: iso(new Date(y, m, d)), to: iso(new Date(y, m, d)) };
    case "week": {
      const start = new Date(y, m, d);
      const day = start.getDay();          // 0 = Sun
      const diff = day === 0 ? 6 : day - 1; // Monday = start of week
      start.setDate(start.getDate() - diff);
      return { from: iso(start), to: iso(new Date(y, m, d)) };
    }
    case "month":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "year":
      return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
    case "all":
    default:
      return { from: null, to: null };
  }
}

export const expenseService = {
  // ── Categories ────────────────────────────────────────────────
  async listCategories(opts: { activeOnly?: boolean } = {}): Promise<ExpenseCategory[]> {
    let q = supabase.from("expense_categories").select("*").order("name");
    if (opts.activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ExpenseCategory[];
  },

  async createCategory(input: ExpenseCategoryInput): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from("expense_categories")
      .insert([{
        name: input.name.trim(),
        icon: input.icon,
        color: input.color,
        is_active: input.is_active ?? true,
        is_default: false,
      }])
      .select("*")
      .single();
    if (error) throw error;
    return data as ExpenseCategory;
  },

  async updateCategory(id: string, patch: Partial<ExpenseCategoryInput>): Promise<ExpenseCategory> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined)      row.name = patch.name.trim();
    if (patch.icon !== undefined)      row.icon = patch.icon;
    if (patch.color !== undefined)     row.color = patch.color;
    if (patch.is_active !== undefined) row.is_active = patch.is_active;
    const { data, error } = await supabase
      .from("expense_categories")
      .update(row).eq("id", id)
      .select("*").single();
    if (error) throw error;
    return data as ExpenseCategory;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Expenses ──────────────────────────────────────────────────
  async listExpenses(filters: ExpenseFilters): Promise<Expense[]> {
    let q = supabase
      .from("expenses")
      .select(EXPENSE_SELECT)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.category_id)     q = q.eq("category_id", filters.category_id);
    if (filters.campus_id)       q = q.eq("campus_id", filters.campus_id);
    if (filters.payment_method)  q = q.eq("payment_method", filters.payment_method);

    // Date filtering: explicit range overrides period.
    if (filters.date_from || filters.date_to) {
      if (filters.date_from) q = q.gte("expense_date", filters.date_from);
      if (filters.date_to)   q = q.lte("expense_date", filters.date_to);
    } else {
      const { from, to } = periodRange(filters.period);
      if (from) q = q.gte("expense_date", from);
      if (to)   q = q.lte("expense_date", to);
    }

    if (filters.search.trim()) {
      const term = filters.search.trim().replace(/[%_]/g, "");
      q = q.or(`title.ilike.%${term}%,notes.ilike.%${term}%`);
    }

    const { data, error } = await q.limit(2000);
    if (error) throw error;
    return (data ?? []) as unknown as Expense[];
  },

  /** Wide window for analytics — last 365 days, joined. */
  async listForAnalytics(): Promise<Expense[]> {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 365);
    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_SELECT)
      .gte("expense_date", from.toISOString().slice(0, 10))
      .order("expense_date", { ascending: true })
      .limit(5000);
    if (error) throw error;
    return (data ?? []) as unknown as Expense[];
  },

  async createExpense(input: ExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from("expenses")
      .insert([{
        title: input.title.trim(),
        category_id: input.category_id,
        amount: input.amount,
        payment_method: input.payment_method,
        expense_date: input.expense_date,
        campus_id: input.campus_id,
        notes: input.notes?.trim() || null,
      }])
      .select(EXPENSE_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as Expense;
  },

  async updateExpense(id: string, patch: Partial<ExpenseInput>): Promise<Expense> {
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined)          row.title = patch.title.trim();
    if (patch.category_id !== undefined)    row.category_id = patch.category_id;
    if (patch.amount !== undefined)         row.amount = patch.amount;
    if (patch.payment_method !== undefined) row.payment_method = patch.payment_method;
    if (patch.expense_date !== undefined)   row.expense_date = patch.expense_date;
    if (patch.campus_id !== undefined)      row.campus_id = patch.campus_id;
    if (patch.notes !== undefined)          row.notes = patch.notes?.trim() || null;
    const { data, error } = await supabase
      .from("expenses")
      .update(row).eq("id", id)
      .select(EXPENSE_SELECT).single();
    if (error) throw error;
    return data as unknown as Expense;
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Lookups ───────────────────────────────────────────────────
  async listCampuses(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("campuses").select("id, name").order("name");
    if (error) throw error;
    return (data ?? []) as { id: string; name: string }[];
  },
};
