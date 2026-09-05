"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Account,
  Budget,
  Category,
  Profile,
  SavingsGoal,
  Transaction,
  Currency,
} from "@/lib/types";
import { toBase } from "@/lib/format";

interface DataCtx {
  supabase: ReturnType<typeof createClient>;
  loading: boolean;
  error: string | null;
  profile: Profile | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  base: Currency;
  usdMxn: number;
  reload: () => Promise<void>;
  accountBalance: (accountId: string) => number;
  toBaseAmount: (amount: number, currency: Currency) => number;
}

const Ctx = createContext<DataCtx | null>(null);

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData must be used inside DataProvider");
  return c;
}

export default function DataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [p, a, c, t, b, g] = await Promise.all([
        supabase.from("profiles").select("*").single(),
        supabase.from("accounts").select("*").order("sort").order("created_at"),
        supabase.from("categories").select("*").order("sort"),
        supabase
          .from("transactions")
          .select("*")
          .order("txn_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("budgets").select("*"),
        supabase.from("savings_goals").select("*").order("created_at"),
      ]);
      if (p.error && p.error.code !== "PGRST116") throw p.error;
      if (a.error) throw a.error;
      if (c.error) throw c.error;
      if (t.error) throw t.error;
      if (b.error) throw b.error;
      if (g.error) throw g.error;
      setProfile(p.data as Profile);
      setAccounts((a.data as Account[]) || []);
      setCategories((c.data as Category[]) || []);
      setTransactions((t.data as Transaction[]) || []);
      setBudgets((b.data as Budget[]) || []);
      setGoals((g.data as SavingsGoal[]) || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  const base: Currency = profile?.base_currency || "MXN";
  const usdMxn = profile?.usd_mxn_rate || 18.5;

  const accountBalance = useCallback(
    (accountId: string) => {
      const acct = accounts.find((x) => x.id === accountId);
      if (!acct) return 0;
      let bal = Number(acct.opening_balance);
      for (const t of transactions) {
        if (t.account_id === accountId) bal += Number(t.amount);
      }
      return bal;
    },
    [accounts, transactions]
  );

  const toBaseAmount = useCallback(
    (amount: number, currency: Currency) =>
      toBase(amount, currency, base, usdMxn),
    [base, usdMxn]
  );

  return (
    <Ctx.Provider
      value={{
        supabase,
        loading,
        error,
        profile,
        accounts,
        categories,
        transactions,
        budgets,
        goals,
        base,
        usdMxn,
        reload,
        accountBalance,
        toBaseAmount,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
