"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import type { Category, Currency } from "@/lib/types";

const CAT_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b6ff5", "#6366f1", "#8b5cf6",
  "#a855f7", "#ec4899", "#64748b", "#9ca3af",
];

export default function SettingsPage() {
  const d = useData();
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [baseCur, setBaseCur] = useState<Currency>("MXN");
  const [rate, setRate] = useState("");
  const [income, setIncome] = useState("");
  const [inited, setInited] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [newCat, setNewCat] = useState("");
  const [newKind, setNewKind] = useState<"expense" | "income">("expense");
  const [newColor, setNewColor] = useState(CAT_COLORS[9]);

  if (d.loading) return <Spinner />;

  if (!inited && d.profile) {
    setFullName(d.profile.full_name || "");
    setBaseCur(d.profile.base_currency);
    setRate(String(d.profile.usd_mxn_rate));
    setIncome(String(d.profile.monthly_income ?? 0));
    setInited(true);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const r = parseFloat(rate);
      const inc = parseFloat(income);
      const { error } = await d.supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          base_currency: baseCur,
          usd_mxn_rate: isNaN(r) || r <= 0 ? 18.5 : r,
          monthly_income: isNaN(inc) || inc < 0 ? 0 : inc,
          updated_at: new Date().toISOString(),
        })
        .eq("id", d.profile!.id);
      if (error) throw error;
      await d.reload();
      setProfileMsg("Saved.");
    } catch (e: any) {
      setProfileMsg(e?.message || "Error saving.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    if (pw.length < 6) {
      setPwErr("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setPwErr("Passwords do not match.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await d.supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPwMsg("Password updated.");
      setPw("");
      setPw2("");
    } catch (e: any) {
      setPwErr(e?.message || "Could not update password.");
    } finally {
      setPwBusy(false);
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.trim()) return;
    const {
      data: { user },
    } = await d.supabase.auth.getUser();
    await d.supabase.from("categories").insert({
      user_id: user!.id,
      name: newCat.trim(),
      kind: newKind,
      color: newColor,
      sort: 100,
    });
    setNewCat("");
    await d.reload();
  }

  async function updateCat(c: Category, patch: Partial<Category>) {
    await d.supabase.from("categories").update(patch).eq("id", c.id);
    await d.reload();
  }

  async function deleteCat(c: Category) {
    if (
      !confirm(
        `Delete category "${c.name}"? Transactions keep their history but become uncategorized.`
      )
    )
      return;
    await d.supabase.from("categories").delete().eq("id", c.id);
    await d.reload();
  }

  const expenseCats = d.categories.filter((c) => c.kind === "expense");
  const incomeCats = d.categories.filter((c) => c.kind === "income");

  const CatList = ({ list }: { list: Category[] }) => (
    <div>
      {list.map((c) => (
        <div
          key={c.id}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}
        >
          <input
            type="color"
            value={c.color}
            onChange={(e) => updateCat(c, { color: e.target.value })}
            style={{ width: 26, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }}
            title="Change color"
          />
          <input
            className="input"
            defaultValue={c.name}
            style={{ maxWidth: 260 }}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== c.name)
                updateCat(c, { name: e.target.value.trim() });
            }}
          />
          <div style={{ flex: 1 }} />
          <button className="btn btn-danger btn-sm" onClick={() => deleteCat(c)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ margin: "0 0 14px" }}>
          <h2>Preferences</h2>
        </div>
        {profileMsg && (
          <div className={"alert " + (profileMsg === "Saved." ? "alert-ok" : "alert-err")}>
            {profileMsg}
          </div>
        )}
        <form onSubmit={saveProfile}>
          <div className="field">
            <label>Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label>Planned monthly income ({baseCur})</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="0.00"
            />
            <span className="muted" style={{ fontSize: 12 }}>
              Used on the Budgets page to show what's left to budget. Also editable there.
            </span>
          </div>
          <div className="row">
            <div className="field">
              <label>Base (display) currency</label>
              <select
                className="select"
                value={baseCur}
                onChange={(e) => setBaseCur(e.target.value as Currency)}
              >
                <option value="MXN">MXN — Mexican Peso</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
            <div className="field">
              <label>Exchange rate — 1 USD = ? MXN</label>
              <input
                className="input"
                type="number"
                step="0.0001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
            Net worth and reports combine your MXN and USD accounts into the base
            currency using this rate. Update it whenever the rate moves.
          </p>
          <button className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save preferences"}
          </button>
        </form>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ margin: "0 0 14px" }}>
          <h2>Categories</h2>
        </div>
        <form onSubmit={addCategory} className="row" style={{ alignItems: "flex-end", marginBottom: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>New category</label>
            <input
              className="input"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="Category name"
            />
          </div>
          <div className="field" style={{ marginBottom: 0, maxWidth: 130, flex: "0 0 130px" }}>
            <label>Type</label>
            <select className="select" value={newKind} onChange={(e) => setNewKind(e.target.value as any)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: "0 0 46px" }}>
            <label>Color</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ width: 40, height: 38, border: "1px solid var(--border-strong)", borderRadius: 8, background: "none", cursor: "pointer" }}
            />
          </div>
          <button className="btn btn-primary" style={{ flex: "0 0 auto" }}>
            <IconPlus size={16} /> Add
          </button>
        </form>

        <h4 style={{ fontSize: 12.5, textTransform: "uppercase", color: "var(--text-3)", letterSpacing: "0.04em", margin: "8px 0" }}>
          Expense categories
        </h4>
        <CatList list={expenseCats} />
        <h4 style={{ fontSize: 12.5, textTransform: "uppercase", color: "var(--text-3)", letterSpacing: "0.04em", margin: "18px 0 8px" }}>
          Income categories
        </h4>
        <CatList list={incomeCats} />
      </div>

      <div className="card card-pad">
        <div className="section-head" style={{ margin: "0 0 14px" }}>
          <h2>Change Password</h2>
        </div>
        {pwErr && <div className="alert alert-err">{pwErr}</div>}
        {pwMsg && <div className="alert alert-ok">{pwMsg}</div>}
        <form onSubmit={changePassword} style={{ maxWidth: 360 }}>
          <div className="field">
            <label>New password</label>
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input
              className="input"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-primary" disabled={pwBusy}>
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
