"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner } from "@/components/ui";
import { IconSpark } from "@/components/icons";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK = [
  "Build me a monthly budget from my income and spending.",
  "Where am I overspending, and where can I realistically cut back?",
  "What's the smartest way to attack my debt?",
  "Am I saving enough? How should I split my surplus?",
];

export default function AdvisorPage() {
  const d = useData();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await d.supabase
        .from("advisor_chats")
        .select("role, content")
        .order("created_at", { ascending: true });
      setMsgs((data as Msg[]) || []);
      setLoadingHist(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setErr(null);
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Something went wrong.");
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function clearChat() {
    if (!confirm("Clear this conversation? The advisor will forget past context.")) return;
    const {
      data: { user },
    } = await d.supabase.auth.getUser();
    await d.supabase.from("advisor_chats").delete().eq("user_id", user!.id);
    setMsgs([]);
  }

  if (loadingHist) return <Spinner />;

  return (
    <div style={{ maxWidth: 780, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 160px)" }}>
      <div className="alert alert-info" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <IconSpark />
        <div>
          <strong>Suggestions only.</strong> This advisor reads your accounts, spending,
          budgets, debts and goals and gives you ideas — it never changes anything in the app.
          You decide what to enter.
        </div>
      </div>

      {msgs.length === 0 && (
        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Ask your money a question</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
            It already knows your numbers. Try one of these:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {QUICK.map((q) => (
              <button
                key={q}
                className="btn"
                style={{ justifyContent: "flex-start", textAlign: "left" }}
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
            }}
          >
            <div
              className="card"
              style={{
                padding: "12px 15px",
                background: m.role === "user" ? "var(--accent)" : "var(--surface)",
                color: m.role === "user" ? "#fff" : "var(--text)",
                borderColor: m.role === "user" ? "var(--accent)" : "var(--border)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontSize: 14,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: "flex-start" }}>
            <div className="card" style={{ padding: "12px 15px", color: "var(--text-3)" }}>
              Thinking through your numbers…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {err && <div className="alert alert-err">{err}</div>}

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--bg)",
          paddingTop: 8,
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          className="input"
          rows={2}
          style={{ resize: "none", flex: 1 }}
          placeholder="Ask for budget help, a debt plan, where to cut back…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn btn-primary" onClick={() => send(input)} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
      {msgs.length > 0 && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: "flex-start", marginTop: 8 }}
          onClick={clearChat}
        >
          Clear conversation
        </button>
      )}
    </div>
  );
}
