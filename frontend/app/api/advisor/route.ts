import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Cur = "MXN" | "USD";
function toBase(amount: number, from: Cur, base: Cur, usdMxn: number) {
  if (from === base) return amount;
  if (from === "USD" && base === "MXN") return amount * usdMxn;
  if (from === "MXN" && base === "USD") return amount / usdMxn;
  return amount;
}
const money = (n: number, c: Cur) =>
  new Intl.NumberFormat(c === "MXN" ? "es-MX" : "en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  }).format(n);

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The AI advisor isn't configured yet. Add an ANTHROPIC_API_KEY environment variable in Vercel and redeploy.",
      },
      { status: 503 }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const message: string = (body?.message || "").toString().slice(0, 4000).trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }

  // ---- Load the user's financial data (RLS scopes to this user) ----
  const sixMonthsAgo = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const monthNow = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const [profileR, accountsR, catsR, txnsR, budgetsR, debtsR, goalsR, histR] =
    await Promise.all([
      supabase.from("profiles").select("*").single(),
      supabase.from("accounts").select("*").eq("is_archived", false),
      supabase.from("categories").select("*"),
      supabase.from("transactions").select("*").gte("txn_date", sixMonthsAgo),
      supabase.from("budgets").select("*").eq("month", monthNow),
      supabase.from("debts").select("*").eq("is_closed", false),
      supabase.from("savings_goals").select("*"),
      supabase
        .from("advisor_chats")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

  const base: Cur = (profileR.data?.base_currency as Cur) || "MXN";
  const usdMxn = Number(profileR.data?.usd_mxn_rate) || 18.5;
  const plannedIncome = Number(profileR.data?.monthly_income) || 0;
  const accounts = accountsR.data || [];
  const cats = catsR.data || [];
  const txns = txnsR.data || [];
  const budgets = budgetsR.data || [];
  const debts = debtsR.data || [];
  const goals = goalsR.data || [];
  const catName: Record<string, string> = {};
  for (const c of cats) catName[c.id] = c.name;

  // net worth
  let assets = 0,
    liabilities = 0;
  for (const a of accounts) {
    const txForAcct = txns.filter((t: any) => t.account_id === a.id);
    // opening balance + all txns in range is only partial; use opening + all loaded txns
    let bal = Number(a.opening_balance);
    for (const t of txForAcct) bal += Number(t.amount);
    const b = toBase(bal, a.currency as Cur, base, usdMxn);
    if (b >= 0) assets += b;
    else liabilities += -b;
  }

  // monthly income / expense / category averages over the period
  const monthSet = new Set<string>();
  let sumIncome = 0,
    sumExpense = 0;
  const catTotals: Record<string, number> = {};
  for (const t of txns) {
    const mk = String(t.txn_date).slice(0, 7);
    monthSet.add(mk);
    const b = toBase(Number(t.amount), t.currency as Cur, base, usdMxn);
    if (t.type === "income") sumIncome += b;
    else if (t.type === "expense") {
      sumExpense += -b;
      const k = t.category_id ? catName[t.category_id] || "Uncategorized" : "Uncategorized";
      catTotals[k] = (catTotals[k] || 0) + -b;
    }
  }
  const months = Math.max(1, monthSet.size);
  const avgIncome = sumIncome / months;
  const avgExpense = sumExpense / months;
  const catAvg = Object.entries(catTotals)
    .map(([k, v]) => [k, v / months] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  // ---- Build the summary the model sees ----
  const lines: string[] = [];
  lines.push(`Base currency: ${base}. USD→MXN rate: ${usdMxn}.`);
  lines.push(
    `Net worth: ${money(assets - liabilities, base)} (assets ${money(assets, base)}, liabilities ${money(liabilities, base)}).`
  );
  if (plannedIncome > 0) {
    lines.push(`Planned monthly income (set by Frank): ${money(plannedIncome, base)}.`);
  }
  lines.push(
    `Average monthly income from logged transactions (last ${months} mo): ${money(avgIncome, base)}. Average monthly spending: ${money(avgExpense, base)}. Average monthly surplus: ${money(avgIncome - avgExpense, base)}.`
  );
  if (catAvg.length) {
    lines.push("Average monthly spending by category:");
    for (const [k, v] of catAvg.slice(0, 15)) lines.push(`  - ${k}: ${money(v, base)}`);
  }
  if (budgets.length) {
    lines.push("Budgets set for this month:");
    for (const b of budgets)
      lines.push(`  - ${catName[b.category_id] || "?"}: ${money(Number(b.amount), base)}`);
  } else {
    lines.push("No category budgets set for this month yet.");
  }
  if (debts.length) {
    lines.push("Debts:");
    for (const d of debts)
      lines.push(
        `  - ${d.name} (${d.kind}): balance ${money(Number(d.balance), d.currency as Cur)}, APR ${Number(d.apr)}%, min payment ${money(Number(d.min_payment), d.currency as Cur)}${Number(d.monthly_fee) > 0 ? `, ${money(Number(d.monthly_fee), d.currency as Cur)}/mo fee` : ""}`
      );
  } else {
    lines.push("No debts tracked.");
  }
  if (goals.length) {
    lines.push("Savings goals:");
    for (const g of goals)
      lines.push(
        `  - ${g.name}: ${money(Number(g.saved_amount), g.currency as Cur)} of ${money(Number(g.target_amount), g.currency as Cur)}${g.target_date ? ` by ${g.target_date}` : ""}`
      );
  }

  const summary = lines.join("\n");

  const system = `You are a personal finance advisor built into Frank's own budgeting app ("Finance Portal"). Frank lives and operates in Mexico; amounts are in ${base} unless noted.

You give SUGGESTIONS ONLY. You cannot and do not change any data in his app — you never claim to have set a budget, moved money, paid a debt, or edited anything. When you recommend budget numbers or actions, tell him what to enter or do himself in the app (Budgets, Debts, Goals, Transactions tabs).

Style: direct and blunt, like a sharp friend who's good with money. No hedging, no filler, no flattery. Lead with the recommendation. Use concrete numbers from his actual data below. Prefer specifics over generalities. Keep it tight — short paragraphs or a compact list, not an essay. Use his base currency (${base}) for figures. You are not a licensed financial advisor; don't give tax or legal advice, and note when something warrants a professional.

Learn and reflect his patterns from the data and from the running conversation. If the data is thin (little transaction history), say so and ask for what you'd need, rather than inventing numbers.

Here is Frank's current financial snapshot:
${summary}`;

  const history = (histR.data || []).map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content),
  }));
  const messages = [...history, { role: "user", content: message }];

  let reply = "";
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 1300, system, messages }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `AI request failed (${resp.status}).` },
        { status: 502 }
      );
    }
    reply = (data?.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Could not reach the AI service." },
      { status: 502 }
    );
  }

  if (!reply) reply = "I couldn't produce a suggestion just now — try rephrasing.";

  // persist the exchange (best-effort)
  await supabase.from("advisor_chats").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: reply },
  ]);

  return NextResponse.json({ reply });
}
