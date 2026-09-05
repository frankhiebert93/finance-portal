"use client";

import { useMemo, useState } from "react";
import { Modal } from "./ui";
import { useData } from "./DataProvider";
import { parseCSV, parseAmount, parseDateFlexible } from "@/lib/csv";
import { formatMoney, todayISO } from "@/lib/format";
import type { Currency } from "@/lib/types";

function guess(headers: string[], candidates: string[]): number {
  const low = headers.map((h) => h.toLowerCase().trim());
  for (const cand of candidates) {
    const i = low.findIndex((h) => h.includes(cand));
    if (i > -1) return i;
  }
  return -1;
}

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const d = useData();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountId, setAccountId] = useState(d.accounts[0]?.id || "");
  const [rows, setRows] = useState<string[][]>([]);
  const [filename, setFilename] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [dateCol, setDateCol] = useState(-1);
  const [descCol, setDescCol] = useState(-1);
  const [mode, setMode] = useState<"single" | "split">("single");
  const [amountCol, setAmountCol] = useState(-1);
  const [debitCol, setDebitCol] = useState(-1);
  const [creditCol, setCreditCol] = useState(-1);
  const [catCol, setCatCol] = useState(-1);
  const [flip, setFlip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const account = d.accounts.find((a) => a.id === accountId);
  const headers = rows[0] || [];
  const dataRows = hasHeader ? rows.slice(1) : rows;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result || ""));
      setRows(parsed);
      const h = parsed[0] || [];
      setDateCol(guess(h, ["date", "fecha"]));
      setDescCol(guess(h, ["desc", "concepto", "payee", "detail", "memo", "name", "reference"]));
      const amtGuess = guess(h, ["amount", "importe", "monto", "value"]);
      const debGuess = guess(h, ["debit", "cargo", "withdraw", "retiro"]);
      const credGuess = guess(h, ["credit", "abono", "deposit", "deposito"]);
      if (debGuess > -1 || credGuess > -1) {
        setMode("split");
        setDebitCol(debGuess);
        setCreditCol(credGuess);
      } else {
        setMode("single");
        setAmountCol(amtGuess);
      }
      setCatCol(guess(h, ["category", "categoria"]));
      setStep(2);
    };
    reader.readAsText(file);
  }

  const preview = useMemo(() => {
    return dataRows.slice(0, 60).map((r) => {
      const date = dateCol > -1 ? parseDateFlexible(r[dateCol]) : todayISO();
      let amount: number | null = null;
      if (mode === "single") {
        amount = amountCol > -1 ? parseAmount(r[amountCol]) : null;
      } else {
        const deb = debitCol > -1 ? parseAmount(r[debitCol]) : null;
        const cred = creditCol > -1 ? parseAmount(r[creditCol]) : null;
        if (cred && cred !== 0) amount = Math.abs(cred);
        else if (deb && deb !== 0) amount = -Math.abs(deb);
      }
      if (amount != null && flip) amount = -amount;
      const desc = descCol > -1 ? r[descCol] : "";
      const catName = catCol > -1 ? (r[catCol] || "").trim() : "";
      return { date, amount, desc, catName };
    });
  }, [dataRows, dateCol, descCol, amountCol, debitCol, creditCol, catCol, mode, flip]);

  const validCount = preview.filter((p) => p.amount != null && p.amount !== 0 && p.date).length;

  async function doImport() {
    if (!account) {
      setErr("Pick an account first.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const {
        data: { user },
      } = await d.supabase.auth.getUser();
      const { data: batch, error: bErr } = await d.supabase
        .from("import_batches")
        .insert({
          user_id: user!.id,
          account_id: account.id,
          filename,
          row_count: 0,
          source: "csv",
        })
        .select()
        .single();
      if (bErr) throw bErr;

      const catByName: Record<string, string> = {};
      for (const c of d.categories) catByName[c.name.toLowerCase()] = c.id;

      const all = hasHeader ? rows.slice(1) : rows;
      const inserts: any[] = [];
      for (const r of all) {
        const date = dateCol > -1 ? parseDateFlexible(r[dateCol]) : todayISO();
        let amount: number | null = null;
        if (mode === "single") {
          amount = amountCol > -1 ? parseAmount(r[amountCol]) : null;
        } else {
          const deb = debitCol > -1 ? parseAmount(r[debitCol]) : null;
          const cred = creditCol > -1 ? parseAmount(r[creditCol]) : null;
          if (cred && cred !== 0) amount = Math.abs(cred);
          else if (deb && deb !== 0) amount = -Math.abs(deb);
        }
        if (amount == null || amount === 0 || !date) continue;
        if (flip) amount = -amount;
        const catName = catCol > -1 ? (r[catCol] || "").trim().toLowerCase() : "";
        inserts.push({
          user_id: user!.id,
          account_id: account.id,
          category_id: catByName[catName] || null,
          txn_date: date,
          amount,
          currency: account.currency as Currency,
          type: amount < 0 ? "expense" : "income",
          payee: descCol > -1 ? (r[descCol] || "").slice(0, 200) : null,
          source: "csv",
          import_batch_id: batch.id,
        });
      }
      if (inserts.length === 0) throw new Error("No valid rows found to import.");
      // insert in chunks
      for (let i = 0; i < inserts.length; i += 500) {
        const { error } = await d.supabase
          .from("transactions")
          .insert(inserts.slice(i, i + 500));
        if (error) throw error;
      }
      await d.supabase
        .from("import_batches")
        .update({ row_count: inserts.length })
        .eq("id", batch.id);
      await d.reload();
      setDone(inserts.length);
    } catch (e: any) {
      setErr(e?.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  const colOptions = (
    <>
      <option value={-1}>— none —</option>
      {headers.map((h, i) => (
        <option key={i} value={i}>
          {hasHeader ? h || `Column ${i + 1}` : `Column ${i + 1}`}
        </option>
      ))}
    </>
  );

  if (done != null) {
    return (
      <Modal
        title="Import complete"
        onClose={onClose}
        footer={
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        }
      >
        <div className="alert alert-ok">
          Imported {done} transaction{done === 1 ? "" : "s"} into {account?.name}.
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Import transactions (CSV)"
      onClose={onClose}
      footer={
        step === 2 ? (
          <>
            <button className="btn" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={doImport}
              disabled={busy || validCount === 0}
            >
              {busy ? "Importing…" : `Import ${validCount} rows`}
            </button>
          </>
        ) : (
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        )
      }
    >
      {err && <div className="alert alert-err">{err}</div>}

      {step === 1 && (
        <>
          <div className="field">
            <label>Import into account</label>
            <select
              className="select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {d.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>CSV file</label>
            <input
              className="input"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={onFile}
            />
          </div>
          <p className="muted" style={{ fontSize: 12.5 }}>
            Export a CSV from your bank or spreadsheet. On the next step you'll map
            which columns are the date, description and amount. Amounts entered in
            the account's currency ({account?.currency}).
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <label className="pill" style={{ cursor: "pointer", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
            />
            First row is a header
          </label>

          <div className="row">
            <div className="field">
              <label>Date column</label>
              <select
                className="select"
                value={dateCol}
                onChange={(e) => setDateCol(Number(e.target.value))}
              >
                {colOptions}
              </select>
            </div>
            <div className="field">
              <label>Description column</label>
              <select
                className="select"
                value={descCol}
                onChange={(e) => setDescCol(Number(e.target.value))}
              >
                {colOptions}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Amount format</label>
            <select
              className="select"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
            >
              <option value="single">Single amount column (+ / −)</option>
              <option value="split">Separate debit &amp; credit columns</option>
            </select>
          </div>

          {mode === "single" ? (
            <div className="field">
              <label>Amount column</label>
              <select
                className="select"
                value={amountCol}
                onChange={(e) => setAmountCol(Number(e.target.value))}
              >
                {colOptions}
              </select>
            </div>
          ) : (
            <div className="row">
              <div className="field">
                <label>Debit (money out)</label>
                <select
                  className="select"
                  value={debitCol}
                  onChange={(e) => setDebitCol(Number(e.target.value))}
                >
                  {colOptions}
                </select>
              </div>
              <div className="field">
                <label>Credit (money in)</label>
                <select
                  className="select"
                  value={creditCol}
                  onChange={(e) => setCreditCol(Number(e.target.value))}
                >
                  {colOptions}
                </select>
              </div>
            </div>
          )}

          <div className="row">
            <div className="field">
              <label>Category column (optional)</label>
              <select
                className="select"
                value={catCol}
                onChange={(e) => setCatCol(Number(e.target.value))}
              >
                {colOptions}
              </select>
            </div>
            <div className="field">
              <label>Signs</label>
              <label className="pill" style={{ cursor: "pointer", marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={flip}
                  onChange={(e) => setFlip(e.target.checked)}
                />
                Flip +/−
              </label>
            </div>
          </div>

          <div style={{ marginTop: 6, marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
            Preview · {validCount} valid of {dataRows.length} rows
          </div>
          <div className="table-wrap" style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 12).map((p, i) => (
                  <tr key={i}>
                    <td className={p.date ? "" : "neg"}>{p.date || "invalid"}</td>
                    <td>{p.desc || "—"}</td>
                    <td
                      className={
                        "num " + (p.amount == null ? "neg" : p.amount < 0 ? "neg" : "pos")
                      }
                    >
                      {p.amount == null
                        ? "—"
                        : formatMoney(p.amount, (account?.currency || "MXN") as Currency, {
                            sign: true,
                          })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
