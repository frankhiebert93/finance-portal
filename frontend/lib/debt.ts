// Debt amortization + payoff-strategy engine.

export interface AmortRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  fee: number;
  balance: number;
}

export interface AmortResult {
  months: number;
  totalInterest: number;
  totalFees: number;
  totalPaid: number; // principal + interest + fees
  payoffDate: Date | null;
  schedule: AmortRow[];
  neverPayoff: boolean; // payment can't cover interest
}

const MAX_MONTHS = 1200;

// Amortize a single debt paying `payment` per month plus a fixed `monthlyFee`
// that is an added cost (does not reduce principal).
export function amortize(
  balance: number,
  apr: number,
  payment: number,
  monthlyFee: number = 0
): AmortResult {
  const r = apr / 100 / 12;
  let bal = balance;
  let totalInterest = 0;
  let totalFees = 0;
  const schedule: AmortRow[] = [];

  if (bal <= 0) {
    return {
      months: 0,
      totalInterest: 0,
      totalFees: 0,
      totalPaid: 0,
      payoffDate: new Date(),
      schedule: [],
      neverPayoff: false,
    };
  }

  // If the payment can't cover the first month's interest, it never amortizes.
  if (payment <= bal * r && r > 0) {
    return {
      months: Infinity,
      totalInterest: Infinity,
      totalFees: Infinity,
      totalPaid: Infinity,
      payoffDate: null,
      schedule: [],
      neverPayoff: true,
    };
  }

  let month = 0;
  while (bal > 0.005 && month < MAX_MONTHS) {
    month++;
    const interest = bal * r;
    let principalPortion = payment - interest;
    let pay = payment;
    if (principalPortion >= bal) {
      // final (partial) payment
      principalPortion = bal;
      pay = bal + interest;
    }
    bal -= principalPortion;
    totalInterest += interest;
    totalFees += monthlyFee;
    schedule.push({
      month,
      payment: pay,
      interest,
      principal: principalPortion,
      fee: monthlyFee,
      balance: Math.max(0, bal),
    });
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  return {
    months: month,
    totalInterest,
    totalFees,
    totalPaid: balance + totalInterest + totalFees,
    payoffDate,
    schedule,
    neverPayoff: false,
  };
}

export interface StrategyDebt {
  id: string;
  name: string;
  balance: number; // in the comparison currency (base)
  apr: number;
  minPayment: number;
  monthlyFee: number;
}

export interface StrategyResult {
  months: number;
  totalInterest: number;
  totalFees: number;
  freeDate: Date | null;
  order: { id: string; name: string; payoffMonth: number }[];
  neverPayoff: boolean;
}

// Simulate paying all minimums plus `extraBudget` thrown at the target debt,
// rolling freed minimums forward. order: "avalanche" (highest APR first) or
// "snowball" (smallest balance first).
export function simulate(
  debts: StrategyDebt[],
  extraBudget: number,
  order: "avalanche" | "snowball"
): StrategyResult {
  const list = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({ ...d, bal: d.balance, paidMonth: 0 }));

  if (list.length === 0) {
    return {
      months: 0,
      totalInterest: 0,
      totalFees: 0,
      freeDate: new Date(),
      order: [],
      neverPayoff: false,
    };
  }

  const sorted = [...list].sort((a, b) =>
    order === "avalanche" ? b.apr - a.apr : a.bal - b.bal
  );

  let totalInterest = 0;
  let totalFees = 0;
  let month = 0;

  while (sorted.some((d) => d.bal > 0.005) && month < MAX_MONTHS) {
    month++;
    // accrue interest + fees
    for (const d of sorted) {
      if (d.bal <= 0.005) continue;
      const interest = d.bal * (d.apr / 100 / 12);
      d.bal += interest;
      totalInterest += interest;
      totalFees += d.monthlyFee;
    }
    // budget available this month = all minimums + extra
    let pool =
      sorted.reduce((s, d) => s + (d.bal > 0.005 ? d.minPayment : 0), 0) +
      extraBudget;

    // pay minimums first (in order), then dump the rest on the first open debt
    for (const d of sorted) {
      if (d.bal <= 0.005) continue;
      const pay = Math.min(d.minPayment, d.bal, pool);
      d.bal -= pay;
      pool -= pay;
      if (d.bal <= 0.005 && d.paidMonth === 0) d.paidMonth = month;
    }
    for (const d of sorted) {
      if (pool <= 0.005) break;
      if (d.bal <= 0.005) continue;
      const pay = Math.min(pool, d.bal);
      d.bal -= pay;
      pool -= pay;
      if (d.bal <= 0.005 && d.paidMonth === 0) d.paidMonth = month;
    }
  }

  const neverPayoff = sorted.some((d) => d.bal > 0.005);
  const freeDate = neverPayoff ? null : new Date();
  if (freeDate) freeDate.setMonth(freeDate.getMonth() + month);

  return {
    months: neverPayoff ? Infinity : month,
    totalInterest,
    totalFees,
    freeDate,
    order: sorted.map((d) => ({
      id: d.id,
      name: d.name,
      payoffMonth: d.paidMonth,
    })),
    neverPayoff,
  };
}

export function monthsToText(m: number): string {
  if (!isFinite(m)) return "never";
  const y = Math.floor(m / 12);
  const mo = m % 12;
  if (y === 0) return `${mo} mo`;
  if (mo === 0) return `${y} yr`;
  return `${y} yr ${mo} mo`;
}
