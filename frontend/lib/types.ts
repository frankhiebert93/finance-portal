export type Currency = "MXN" | "USD";

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit_card"
  | "investment"
  | "loan"
  | "other";

export type TxnType = "income" | "expense" | "transfer";

export interface Profile {
  id: string;
  full_name: string | null;
  base_currency: Currency;
  usd_mxn_rate: number;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  opening_balance: number;
  institution: string | null;
  is_archived: boolean;
  source: string;
  sort: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string | null;
  sort: number;
  is_archived: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  txn_date: string;
  amount: number;
  currency: Currency;
  type: TxnType;
  payee: string | null;
  notes: string | null;
  transfer_group: string | null;
  cleared: boolean;
  source: string;
  import_batch_id: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  amount: number;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  currency: Currency;
  target_date: string | null;
  color: string;
  is_complete: boolean;
}

export const ACCOUNT_TYPES: { value: AccountType; label: string; liability?: boolean }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card", liability: true },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan", liability: true },
  { value: "other", label: "Other" },
];

export const LIABILITY_TYPES: AccountType[] = ["credit_card", "loan"];
