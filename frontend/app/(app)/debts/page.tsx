"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner, Modal, EmptyState } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { formatMoney, formatDate } from "@/lib/format";
import { amortize, simulate, monthsToText, type StrategyDebt } from "@/lib/debt";
import { DEBT_KINDS, type Debt, type DebtKind, type Currency } from "@/lib/types";

const emptyForm = {
  name: "",
  kind: "credit_card" as DebtKind,
  currency: "MXN" as Currency,
  balance: "",
  apr: "",
  min_payment: "",
  extra_payment: "0",
  monthly_fee: "0",
  term_months: "",
  due_day: "",
  notes: "",
};

export default function DebtsPage() {
  const d = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Debt | null>(null);
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extra, setExtra] = useState("0");

  if (d.loading) return <Spinner />;

  const debts = d.debts.filter((x) => !x.is_closed);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, currency: d.base });
    setErr(null);
    setModal(true);
  };
  const openEdit = (x: Debt) => {
    setEditing(x);
    setForm({
      name: x.name,
      kind: x.kind,
      currency: x.currency,
      balance: String(x.balance),
      apr: String(x.apr),
      min_payment: String(x.min_payment),
      extra_payment: String(x.extra_payment),
      monthly_fee: String(x.monthly_fee),
      term_months: x.term_months ? String(x.term_months) : "",
      due_day: x.due_day ? String(x.due_day) : "",
      notes: x.notes || "",
    });
    setErr(null);
    setModal(true);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const {
        data: { user },
      } = await d.supabase.auth.getUser();
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        currency: form.currency,
        balance: parseFloat(form.balance) || 0,
        apr: parseFloat(form.apr) || 0,
        min_payment: parseFloat(form.min_payment) || 0,
        extra_payment: parseFloat(form.extra_payment) || 0,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        term_months: form.term_months ? parseInt(form.term_months) : null,
        due_day: form.due_day ? parseInt(form.due_day) : null,
        notes: form.notes.trim() || null,
      };
      if (!payload.name) throw new Error("Give the debt a name.");
      if (editing) {
        const { error } = await d.supabase.from("debts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await d.supabase.from("debts").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
      await d.reload();
      setModal(false);
    } catch (e: any) {
      setErr(e?.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(x: Debt) {
    if (!confirm(`Delete "${x.name}"? This removes the debt and its payoff plan.`)) return;
    await d.supabase.from("debts").delete().eq("id", x.id);
    await d.reload();
  }

  async function markPaid(x: Debt) {
    await d.supabase.from("debts").update({ is_closed: true, balance: 0 }).eq("id", x.id);
    await d.reload();
  }

  // ---- Summary (base currency) ----
  const totalDebt = debts.reduce((s, x) => s + d.toBaseAmount(Number(x.balance), x.currency), 0);
  const totalMin = debts.reduce((s, x) => s + d.toBaseAmount(Number(x.min_payment), x.currency), 0);
  const totalFees = debts.reduce((s, x) => s + d.toBaseAmount(Number(x.monthly_fee), x.currency), 0);
  const weightedApr =
    totalDebt > 0
      ? debts.reduce((s, x) => s + d.toBaseAmount(Number(x.balance), x.currency) * Number(x.apr), 0) / totalDebt
      : 0;

  // ---- Per-debt amortization at each debt's own payment (min + extra) ----
  const perDebt = debts.map((x) => {
    const payment = Number(x.min_payment) + Number(x.extra_payment);
    const res = amortize(Number(x.balance), Number(x.apr), payment, Number(x.monthly_fee));
    return { debt: x, res, payment };
  });
  const planInterestBase = perDebt.reduce(
    (s, p) => s + (isFinite(p.res.totalInterest) ? d.toBaseAmount(p.res.totalInterest, p.debt.currency) : 0),
    0
  );
  const anyNever = perDebt.some((p) => p.res.neverPayoff);
  const maxMonths = perDebt.reduce((m, p) => Math.max(m, isFinite(p.res.months) ? p.res.months : 0), 0);
  const debtFreeDate =
    !anyNever && maxMonths > 0
      ? (() => {
          const dt = new Date();
          dt.setMonth(dt.getMonth() + maxMonths);
          return dt;
        })()
      : null;

  // ---- Strategy comparison (base currency) ----
  const stratDebts: StrategyDebt[] = debts.map((x) => ({
    id: x.id,
    name: x.name,
    balance: d.toBaseAmount(Number(x.balance), x.currency),
    apr: Number(x.apr),
    minPayment: d.toBaseAmount(Number(x.min_payment), x.currency),
    monthlyFee: d.toBaseAmount(Number(x.monthly_fee), x.currency),
  }));
  const extraNum = parseFloat(extra) || 0;
  const avalanche = useMemo(() => simulate(stratDebts, extraNum, "avalanche"), [JSON.stringify(stratDebts), extraNum]);
  const snowball = useMemo(() => simulate(stratDebts, extraNum, "snowball"), [JSON.stringify(stratDebts), extraNum]);
  const active = strategy === "avalanche" ? avalanche : snowball;
  const other = strategy === "avalanche" ? snowball : avalanche;
  const interestSaved = isFinite(other.totalInterest) && isFinite(active.totalInterest)
    ? other.totalInterest - active.totalInterest
    : 0;

  const kindLabel = (k: DebtKind) => DEBT_KINDS.find((z) => z.value === k)?.label || k;

  return (
    <div>
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openNew}>
          <IconPlus size={16} /> Add Debt
        </button>
      </div>

      {debts.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No debts tracked yet"
            hint="Add a credit card, auto loan, mortgage or personal loan with its balance, APR and payment. You'll get payoff timelines, total interest, and an avalanche-vs-snowball plan."
            action={
              <button className="btn btn-primary" onClick={openNew}>
                <IconPlus size={16} /> Add your first debt
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid stat-grid" style={{ marginBottom: 16 }}>
            <div className="card stat">
              <div className="label">Total Debt</div>
              <div className="value neg">{formatMoney(totalDebt, d.base)}</div>
              <div className="sub">{debts.length} debts · {d.base}</div>
            </div>
            <div className="card stat">
              <div className="label">Weighted APR</div>
              <div className="value">{weightedApr.toFixed(2)}%</div>
              <div className="sub">Balance-weighted average</div>
            </div>
            <div className="card stat">
              <div className="label">Monthly Minimums</div>
              <div className="value">{formatMoney(totalMin, d.base)}</div>
              <div className="sub">
                {totalFees > 0 ? `+ ${formatMoney(totalFees, d.base)} fees` : "No recurring fees"}
              </div>
            </div>
            <div className="card stat">
              <div className="label">Projected Interest</div>
              <div className="value neg">{anyNever ? "—" : formatMoney(planInterestBase, d.base)}</div>
              <div className="sub">
                {anyNever
                  ? "A payment is below its interest"
                  : debtFreeDate
                  ? `Debt-free ${formatDate(debtFreeDate.toISOString().slice(0, 10))}`
                  : "All clear"}
              </div>
            </div>
          </div>

          {/* Per-debt list */}
          <div className="card table-wrap" style={{ marginBottom: 16 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Debt</th>
                  <th className="num">Balance</th>
                  <th className="num">APR</th>
                  <th className="num">Payment</th>
                  <th className="num">Payoff</th>
                  <th className="num">Total Interest</th>
                  <th style={{ width: 150 }}></th>
                </tr>
              </thead>
              <tbody>
                {perDebt.map(({ debt: x, res, payment }) => (
                  <tr key={x.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {x.name} <span className="tag-cur">{x.currency}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {kindLabel(x.kind)}
                        {Number(x.monthly_fee) > 0 ? ` · ${formatMoney(Number(x.monthly_fee), x.currency)}/mo fee` : ""}
                      </div>
                    </td>
                    <td className="num neg"><strong>{formatMoney(Number(x.balance), x.currency)}</strong></td>
                    <td className="num">{Number(x.apr).toFixed(2)}%</td>
                    <td className="num">
                      {formatMoney(payment, x.currency)}
                      {Number(x.extra_payment) > 0 && (
                        <div className="muted" style={{ fontSize: 11 }}>
                          incl. +{formatMoney(Number(x.extra_payment), x.currency)}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {res.neverPayoff ? (
                        <span className="neg" title="Payment doesn't cover interest">never</span>
                      ) : (
                        <>
                          {monthsToText(res.months)}
                          <div className="muted" style={{ fontSize: 11 }}>
                            {res.payoffDate ? formatDate(res.payoffDate.toISOString().slice(0, 10)) : ""}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="num neg">
                      {res.neverPayoff ? "∞" : formatMoney(res.totalInterest, x.currency)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setScheduleFor(x)} disabled={res.neverPayoff}>
                          Schedule
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(x)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => markPaid(x)} title="Mark paid off">✓</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(x)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payoff planner */}
          {debts.length >= 1 && (
            <div className="card card-pad">
              <div className="section-head" style={{ margin: "0 0 14px" }}>
                <h2>Payoff Planner</h2>
                <span className="muted" style={{ fontSize: 12.5 }}>Amounts in {d.base}</span>
              </div>
              <div className="toolbar" style={{ marginBottom: 18 }}>
                <div className="field" style={{ marginBottom: 0, maxWidth: 240 }}>
                  <label>Extra you can pay each month (on top of minimums)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Strategy</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className={"btn btn-sm " + (strategy === "avalanche" ? "btn-primary" : "")}
                      onClick={() => setStrategy("avalanche")}
                    >
                      Avalanche
                    </button>
                    <button
                      className={"btn btn-sm " + (strategy === "snowball" ? "btn-primary" : "")}
                      onClick={() => setStrategy("snowball")}
                    >
                      Snowball
                    </button>
                  </div>
                </div>
              </div>

              <p className="muted" style={{ fontSize: 12.5, marginTop: -6, marginBottom: 16 }}>
                {strategy === "avalanche"
                  ? "Avalanche throws every extra peso/dollar at your highest-APR debt first — least total interest."
                  : "Snowball clears your smallest balance first for quick wins and momentum."}
              </p>

              <div className="grid stat-grid" style={{ marginBottom: 16 }}>
                <div className="card stat">
                  <div className="label">Debt-Free In</div>
                  <div className="value">{active.neverPayoff ? "never" : monthsToText(active.months)}</div>
                  <div className="sub">
                    {active.freeDate ? formatDate(active.freeDate.toISOString().slice(0, 10)) : "Increase your payment"}
                  </div>
                </div>
                <div className="card stat">
                  <div className="label">Total Interest</div>
                  <div className="value neg">{active.neverPayoff ? "∞" : formatMoney(active.totalInterest, d.base)}</div>
                  <div className="sub">Over the whole payoff</div>
                </div>
                <div className="card stat">
                  <div className="label">vs {strategy === "avalanche" ? "Snowball" : "Avalanche"}</div>
                  <div className={"value " + (interestSaved > 0 ? "pos" : "")}>
                    {interestSaved > 0 ? formatMoney(interestSaved, d.base) : formatMoney(0, d.base)}
                  </div>
                  <div className="sub">Interest {interestSaved > 0 ? "saved" : "difference"}</div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Payoff order</th>
                      <th>Debt</th>
                      <th className="num">Cleared</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.order.map((o, i) => (
                      <tr key={o.id}>
                        <td><span className="pill">{i + 1}</span></td>
                        <td style={{ fontWeight: 600 }}>{o.name}</td>
                        <td className="num">
                          {o.payoffMonth ? monthsToText(o.payoffMonth) : active.neverPayoff ? "never" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / edit modal */}
      {modal && (
        <Modal
          title={editing ? "Edit Debt" : "New Debt"}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          {err && <div className="alert alert-err">{err}</div>}
          <form onSubmit={save}>
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="BBVA Visa, Truck loan…"
                required
              />
            </div>
            <div className="row">
              <div className="field">
                <label>Type</label>
                <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as DebtKind })}>
                  {DEBT_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Currency</label>
                <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Current balance owed</label>
                <input className="input" type="number" step="0.01" min="0" value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })} required />
              </div>
              <div className="field">
                <label>APR (annual %)</label>
                <input className="input" type="number" step="0.001" min="0" value={form.apr}
                  onChange={(e) => setForm({ ...form, apr: e.target.value })} placeholder="24.99" required />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Minimum / scheduled payment</label>
                <input className="input" type="number" step="0.01" min="0" value={form.min_payment}
                  onChange={(e) => setForm({ ...form, min_payment: e.target.value })} required />
              </div>
              <div className="field">
                <label>Extra payment / month</label>
                <input className="input" type="number" step="0.01" min="0" value={form.extra_payment}
                  onChange={(e) => setForm({ ...form, extra_payment: e.target.value })} />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Monthly fee (optional)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.monthly_fee}
                  onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} />
              </div>
              <div className="field">
                <label>Original term (months, optional)</label>
                <input className="input" type="number" step="1" min="0" value={form.term_months}
                  onChange={(e) => setForm({ ...form, term_months: e.target.value })} placeholder="e.g. 60" />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Due day (1–31, optional)</label>
                <input className="input" type="number" step="1" min="1" max="31" value={form.due_day}
                  onChange={(e) => setForm({ ...form, due_day: e.target.value })} />
              </div>
              <div className="field">
                <label>Notes (optional)</label>
                <input className="input" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Amortization schedule modal */}
      {scheduleFor && (() => {
        const payment = Number(scheduleFor.min_payment) + Number(scheduleFor.extra_payment);
        const res = amortize(Number(scheduleFor.balance), Number(scheduleFor.apr), payment, Number(scheduleFor.monthly_fee));
        return (
          <Modal
            title={`${scheduleFor.name} — payoff schedule`}
            onClose={() => setScheduleFor(null)}
            footer={<button className="btn btn-primary" onClick={() => setScheduleFor(null)}>Close</button>}
          >
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <div><div className="muted" style={{ fontSize: 12 }}>Payoff</div><strong>{monthsToText(res.months)}</strong></div>
              <div><div className="muted" style={{ fontSize: 12 }}>Total interest</div><strong className="neg">{formatMoney(res.totalInterest, scheduleFor.currency)}</strong></div>
              {Number(scheduleFor.monthly_fee) > 0 && (
                <div><div className="muted" style={{ fontSize: 12 }}>Total fees</div><strong className="neg">{formatMoney(res.totalFees, scheduleFor.currency)}</strong></div>
              )}
              <div><div className="muted" style={{ fontSize: 12 }}>Total paid</div><strong>{formatMoney(res.totalPaid, scheduleFor.currency)}</strong></div>
            </div>
            <div className="table-wrap" style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="num">Payment</th>
                    <th className="num">Interest</th>
                    <th className="num">Principal</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {res.schedule.map((r) => (
                    <tr key={r.month}>
                      <td className="muted">{r.month}</td>
                      <td className="num">{formatMoney(r.payment, scheduleFor.currency)}</td>
                      <td className="num neg">{formatMoney(r.interest, scheduleFor.currency)}</td>
                      <td className="num pos">{formatMoney(r.principal, scheduleFor.currency)}</td>
                      <td className="num">{formatMoney(r.balance, scheduleFor.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
