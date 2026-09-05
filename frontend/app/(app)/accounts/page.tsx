"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner, Modal, EmptyState } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { formatMoney } from "@/lib/format";
import { ACCOUNT_TYPES, type Account, type AccountType, type Currency } from "@/lib/types";

const emptyForm = {
  name: "",
  type: "checking" as AccountType,
  currency: "MXN" as Currency,
  opening_balance: "0",
  institution: "",
};

export default function AccountsPage() {
  const d = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  if (d.loading) return <Spinner />;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setErr(null);
    setModal(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      name: a.name,
      type: a.type,
      currency: a.currency,
      opening_balance: String(a.opening_balance),
      institution: a.institution || "",
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
        type: form.type,
        currency: form.currency,
        opening_balance: parseFloat(form.opening_balance) || 0,
        institution: form.institution.trim() || null,
      };
      if (editing) {
        const { error } = await d.supabase
          .from("accounts")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await d.supabase
          .from("accounts")
          .insert({ ...payload, user_id: user!.id });
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

  async function toggleArchive(a: Account) {
    await d.supabase
      .from("accounts")
      .update({ is_archived: !a.is_archived })
      .eq("id", a.id);
    await d.reload();
  }

  async function remove(a: Account) {
    if (
      !confirm(
        `Delete "${a.name}"? This also deletes its transactions. This cannot be undone.`
      )
    )
      return;
    await d.supabase.from("accounts").delete().eq("id", a.id);
    await d.reload();
  }

  const visible = d.accounts.filter((a) => showArchived || !a.is_archived);

  // group balances per currency
  const byCurrency: Record<string, number> = {};
  for (const a of d.accounts) {
    if (a.is_archived) continue;
    byCurrency[a.currency] =
      (byCurrency[a.currency] || 0) + d.accountBalance(a.id);
  }

  return (
    <div>
      <div className="toolbar">
        {Object.entries(byCurrency).map(([cur, bal]) => (
          <div className="pill" key={cur}>
            <span className="tag-cur">{cur}</span>
            <strong style={{ color: bal < 0 ? "var(--red)" : "var(--text)" }}>
              {formatMoney(bal, cur as Currency)}
            </strong>
          </div>
        ))}
        <div className="spacer" />
        <label className="pill" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        <button className="btn btn-primary" onClick={openNew}>
          <IconPlus size={16} /> Add Account
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No accounts yet"
            hint="Add your checking, savings, cash, credit cards and loans to start tracking net worth."
            action={
              <button className="btn btn-primary" onClick={openNew}>
                <IconPlus size={16} /> Add your first account
              </button>
            }
          />
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Institution</th>
                <th className="num">Balance</th>
                <th style={{ width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => {
                const bal = d.accountBalance(a.id);
                const typeLabel = ACCOUNT_TYPES.find((t) => t.value === a.type)?.label;
                return (
                  <tr key={a.id} style={{ opacity: a.is_archived ? 0.5 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {a.name}{" "}
                        <span className="tag-cur">{a.currency}</span>
                      </div>
                    </td>
                    <td>
                      <span className="pill">{typeLabel}</span>
                    </td>
                    <td className="muted">{a.institution || "—"}</td>
                    <td className={"num " + (bal < 0 ? "neg" : "")}>
                      <strong>{formatMoney(bal, a.currency)}</strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleArchive(a)}
                          title={a.is_archived ? "Restore" : "Archive"}
                        >
                          {a.is_archived ? "Restore" : "Archive"}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(a)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit Account" : "New Account"}
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
            <div className="field">
              <label>Account name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="BBVA Checking"
                required
              />
            </div>
            <div className="row">
              <div className="field">
                <label>Type</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as AccountType })
                  }
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Currency</label>
                <select
                  className="select"
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value as Currency })
                  }
                >
                  <option value="MXN">MXN — Peso</option>
                  <option value="USD">USD — Dollar</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>
                Opening / current balance{" "}
                <span className="muted">(use negative for cards/loans owed)</span>
              </label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={form.opening_balance}
                onChange={(e) =>
                  setForm({ ...form, opening_balance: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Institution (optional)</label>
              <input
                className="input"
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                placeholder="BBVA, Santander, Cash…"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
