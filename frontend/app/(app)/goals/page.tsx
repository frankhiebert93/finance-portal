"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner, Modal, EmptyState } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { formatMoney, formatDate } from "@/lib/format";
import type { SavingsGoal, Currency } from "@/lib/types";

const COLORS = ["#0ea5e9", "#22c55e", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#6366f1"];

const emptyForm = {
  name: "",
  target_amount: "",
  saved_amount: "",
  currency: "MXN" as Currency,
  target_date: "",
  color: COLORS[0],
};

export default function GoalsPage() {
  const d = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (d.loading) return <Spinner />;

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, currency: d.base });
    setErr(null);
    setModal(true);
  };
  const openEdit = (g: SavingsGoal) => {
    setEditing(g);
    setForm({
      name: g.name,
      target_amount: String(g.target_amount),
      saved_amount: String(g.saved_amount),
      currency: g.currency,
      target_date: g.target_date || "",
      color: g.color,
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
      const target = parseFloat(form.target_amount) || 0;
      const saved = parseFloat(form.saved_amount) || 0;
      const payload = {
        name: form.name.trim(),
        target_amount: target,
        saved_amount: saved,
        currency: form.currency,
        target_date: form.target_date || null,
        color: form.color,
        is_complete: target > 0 && saved >= target,
      };
      if (editing) {
        const { error } = await d.supabase
          .from("savings_goals")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await d.supabase
          .from("savings_goals")
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

  async function contribute(g: SavingsGoal) {
    const raw = prompt(`Add to "${g.name}" (${g.currency}). Use a negative number to withdraw:`, "");
    if (raw == null) return;
    const delta = parseFloat(raw);
    if (isNaN(delta)) return;
    const saved = Math.max(0, Number(g.saved_amount) + delta);
    await d.supabase
      .from("savings_goals")
      .update({
        saved_amount: saved,
        is_complete: Number(g.target_amount) > 0 && saved >= Number(g.target_amount),
      })
      .eq("id", g.id);
    await d.reload();
  }

  async function remove(g: SavingsGoal) {
    if (!confirm(`Delete goal "${g.name}"?`)) return;
    await d.supabase.from("savings_goals").delete().eq("id", g.id);
    await d.reload();
  }

  return (
    <div>
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openNew}>
          <IconPlus size={16} /> New Goal
        </button>
      </div>

      {d.goals.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No savings goals yet"
            hint="Track targets like an emergency fund, a truck, tools, or a family trip."
            action={
              <button className="btn btn-primary" onClick={openNew}>
                <IconPlus size={16} /> Create a goal
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {d.goals.map((g) => {
            const target = Number(g.target_amount);
            const saved = Number(g.saved_amount);
            const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
            const done = target > 0 && saved >= target;
            return (
              <div className="card card-pad" key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span className="dot" style={{ background: g.color, width: 12, height: 12 }} />
                    <h3 style={{ fontSize: 15.5 }}>{g.name}</h3>
                  </div>
                  {done && <span className="pill" style={{ color: "var(--green)" }}>✓ Reached</span>}
                </div>
                <div style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 700 }}>
                  {formatMoney(saved, g.currency)}
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
                    {" "}/ {formatMoney(target, g.currency)}
                  </span>
                </div>
                <div className="progress" style={{ height: 10 }}>
                  <span style={{ width: `${pct}%`, background: g.color }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span className="muted" style={{ fontSize: 12.5 }}>{pct.toFixed(0)}% funded</span>
                  {g.target_date && (
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      by {formatDate(g.target_date)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => contribute(g)}>
                    Add funds
                  </button>
                  <button className="btn btn-sm" onClick={() => openEdit(g)}>
                    Edit
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-danger btn-sm" onClick={() => remove(g)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit Goal" : "New Savings Goal"}
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
              <label>Goal name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Emergency fund"
                required
              />
            </div>
            <div className="row">
              <div className="field">
                <label>Target amount</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Already saved</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.saved_amount}
                  onChange={(e) => setForm({ ...form, saved_amount: e.target.value })}
                />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Currency</label>
                <select
                  className="select"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="field">
                <label>Target date (optional)</label>
                <input
                  className="input"
                  type="date"
                  value={form.target_date}
                  onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Color</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      border: form.color === c ? "3px solid var(--text)" : "2px solid var(--border)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
