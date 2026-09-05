"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner, Modal, EmptyState } from "@/components/ui";
import { IconPlus, IconUpload } from "@/components/icons";
import ImportModal from "@/components/ImportModal";
import { formatMoney, formatDate, todayISO } from "@/lib/format";
import type { Transaction, TxnType, Currency } from "@/lib/types";

const emptyForm = {
  type: "expense" as TxnType,
  account_id: "",
  to_account_id: "",
  amount: "",
  amount_in: "",
  category_id: "",
  txn_date: todayISO(),
  payee: "",
  notes: "",
};

export default function TransactionsPage() {
  const d = useData();
  const [modal, setModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [fAccount, setFAccount] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fType, setFType] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [q, setQ] = useState("");

  if (d.loading) return <Spinner />;

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, account_id: d.accounts[0]?.id || "", txn_date: todayISO() });
    setErr(null);
    setModal(true);
  };
  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      type: t.type,
      account_id: t.account_id,
      to_account_id: "",
      amount: String(Math.abs(Number(t.amount))),
      amount_in: "",
      category_id: t.category_id || "",
      txn_date: t.txn_date,
      payee: t.payee || "",
      notes: t.notes || "",
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
      const uid = user!.id;
      const amt = parseFloat(form.amount);
      if (!amt || amt <= 0) throw new Error("Enter an amount greater than zero.");

      if (form.type === "transfer" && !editing) {
        const from = d.accounts.find((a) => a.id === form.account_id);
        const to = d.accounts.find((a) => a.id === form.to_account_id);
        if (!from || !to || from.id === to.id)
          throw new Error("Choose two different accounts for a transfer.");
        const group = crypto.randomUUID();
        let amtIn = amt;
        if (from.currency !== to.currency) {
          amtIn = parseFloat(form.amount_in) || 0;
          if (amtIn <= 0)
            throw new Error("Enter the amount received in the destination currency.");
        }
        const { error } = await d.supabase.from("transactions").insert([
          {
            user_id: uid,
            account_id: from.id,
            amount: -Math.abs(amt),
            currency: from.currency,
            type: "transfer",
            txn_date: form.txn_date,
            payee: form.payee || `Transfer to ${to.name}`,
            notes: form.notes || null,
            transfer_group: group,
          },
          {
            user_id: uid,
            account_id: to.id,
            amount: Math.abs(amtIn),
            currency: to.currency,
            type: "transfer",
            txn_date: form.txn_date,
            payee: form.payee || `Transfer from ${from.name}`,
            notes: form.notes || null,
            transfer_group: group,
          },
        ]);
        if (error) throw error;
      } else {
        const acct = d.accounts.find((a) => a.id === form.account_id);
        if (!acct) throw new Error("Choose an account.");
        const signed =
          form.type === "expense" ? -Math.abs(amt) : form.type === "income" ? Math.abs(amt) : Number(editing?.amount) < 0 ? -Math.abs(amt) : Math.abs(amt);
        const payload = {
          account_id: form.account_id,
          amount: signed,
          currency: acct.currency as Currency,
          type: form.type,
          category_id: form.type === "transfer" ? null : form.category_id || null,
          txn_date: form.txn_date,
          payee: form.payee.trim() || null,
          notes: form.notes.trim() || null,
        };
        if (editing) {
          const { error } = await d.supabase
            .from("transactions")
            .update(payload)
            .eq("id", editing.id);
          if (error) throw error;
        } else {
          const { error } = await d.supabase
            .from("transactions")
            .insert({ ...payload, user_id: uid });
          if (error) throw error;
        }
      }
      await d.reload();
      setModal(false);
    } catch (e: any) {
      setErr(e?.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Transaction) {
    if (t.transfer_group) {
      if (!confirm("Delete both sides of this transfer?")) return;
      await d.supabase
        .from("transactions")
        .delete()
        .eq("transfer_group", t.transfer_group);
    } else {
      if (!confirm("Delete this transaction?")) return;
      await d.supabase.from("transactions").delete().eq("id", t.id);
    }
    await d.reload();
  }

  const filtered = useMemo(() => {
    return d.transactions.filter((t) => {
      if (fAccount && t.account_id !== fAccount) return false;
      if (fCategory && t.category_id !== fCategory) return false;
      if (fType && t.type !== fType) return false;
      if (fMonth && !t.txn_date.startsWith(fMonth)) return false;
      if (q) {
        const hay = (t.payee || "") + " " + (t.notes || "");
        if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [d.transactions, fAccount, fCategory, fType, fMonth, q]);

  const shownTotal = filtered.reduce(
    (s, t) => s + d.toBaseAmount(Number(t.amount), t.currency),
    0
  );

  const fromAcct = d.accounts.find((a) => a.id === form.account_id);
  const toAcct = d.accounts.find((a) => a.id === form.to_account_id);
  const crossCurrency =
    form.type === "transfer" && fromAcct && toAcct && fromAcct.currency !== toAcct.currency;
  const relevantCats = d.categories.filter((c) =>
    form.type === "income" ? c.kind === "income" : c.kind === "expense"
  );

  return (
    <div>
      <div className="toolbar">
        <input
          className="input"
          style={{ maxWidth: 200 }}
          placeholder="Search payee/notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="select" style={{ maxWidth: 150 }} value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
          <option value="">All accounts</option>
          {d.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className="select" style={{ maxWidth: 150 }} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
          <option value="">All categories</option>
          {d.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" style={{ maxWidth: 120 }} value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <input
          className="input"
          type="month"
          style={{ maxWidth: 140 }}
          value={fMonth}
          onChange={(e) => setFMonth(e.target.value)}
        />
        <div className="spacer" />
        <button className="btn" onClick={() => setImporting(true)} disabled={d.accounts.length === 0}>
          <IconUpload size={16} /> Import CSV
        </button>
        <button className="btn btn-primary" onClick={openNew} disabled={d.accounts.length === 0}>
          <IconPlus size={16} /> Add
        </button>
      </div>

      {d.accounts.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Add an account first"
            hint="Transactions belong to an account. Create one on the Accounts page."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No transactions match"
            hint="Adjust filters, add one manually, or import a CSV."
            action={
              <button className="btn btn-primary" onClick={openNew}>
                <IconPlus size={16} /> Add transaction
              </button>
            }
          />
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Date</th>
                <th>Payee / Description</th>
                <th>Account</th>
                <th>Category</th>
                <th className="num">Amount</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 400).map((t) => {
                const acct = d.accounts.find((a) => a.id === t.account_id);
                const cat = d.categories.find((c) => c.id === t.category_id);
                return (
                  <tr key={t.id}>
                    <td className="muted">{formatDate(t.txn_date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.payee || "—"}</div>
                      {t.notes && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {t.notes}
                        </div>
                      )}
                    </td>
                    <td className="muted">{acct?.name}</td>
                    <td>
                      {t.type === "transfer" ? (
                        <span className="pill">Transfer</span>
                      ) : cat ? (
                        <span className="pill">
                          <span className="dot" style={{ background: cat.color }} />
                          {cat.name}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className={"num " + (Number(t.amount) < 0 ? "neg" : "pos")}>
                      {formatMoney(Number(t.amount), t.currency, { sign: true })}{" "}
                      <span className="tag-cur">{t.currency}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(t)}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="muted" style={{ fontWeight: 600 }}>
                  {filtered.length} transactions {filtered.length > 400 && "(showing first 400)"}
                </td>
                <td className={"num " + (shownTotal < 0 ? "neg" : "pos")}>
                  <strong>{formatMoney(shownTotal, d.base, { sign: true })}</strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit Transaction" : "New Transaction"}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          {err && <div className="alert alert-err">{err}</div>}
          <form onSubmit={save}>
            {!editing && (
              <div className="field">
                <label>Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["expense", "income", "transfer"] as TxnType[]).map((tp) => (
                    <button
                      type="button"
                      key={tp}
                      className={"btn " + (form.type === tp ? "btn-primary" : "")}
                      style={{ flex: 1, textTransform: "capitalize" }}
                      onClick={() => setForm({ ...form, type: tp, category_id: "" })}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label>{form.type === "transfer" ? "From account" : "Account"}</label>
              <select
                className="select"
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {d.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>

            {form.type === "transfer" && !editing && (
              <div className="field">
                <label>To account</label>
                <select
                  className="select"
                  value={form.to_account_id}
                  onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {d.accounts
                    .filter((a) => a.id !== form.account_id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="row">
              <div className="field">
                <label>
                  Amount{fromAcct ? ` (${fromAcct.currency})` : ""}
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              {crossCurrency && (
                <div className="field">
                  <label>Received ({toAcct!.currency})</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount_in}
                    onChange={(e) => setForm({ ...form, amount_in: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="field">
                <label>Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.txn_date}
                  onChange={(e) => setForm({ ...form, txn_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {form.type !== "transfer" && (
              <div className="field">
                <label>Category</label>
                <select
                  className="select"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {relevantCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label>Payee / description</label>
              <input
                className="input"
                value={form.payee}
                onChange={(e) => setForm({ ...form, payee: e.target.value })}
                placeholder="Walmart, Salary, etc."
              />
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  );
}
