"use client";

import React from "react";

export function Donut({
  segments,
  size = 180,
  thickness = 22,
  centerLabel,
  centerSub,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            segments.map((s, i) => {
              const frac = Math.max(0, s.value) / total;
              const len = frac * circ;
              const el = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
        </g>
        {centerLabel && (
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="var(--text)"
          >
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fontSize="11"
            fill="var(--text-3)"
          >
            {centerSub}
          </text>
        )}
      </svg>
      <div className="legend" style={{ flexDirection: "column", marginTop: 0, gap: 9 }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <div className="legend-item" key={i}>
              <span
                className="dot"
                style={{ background: s.color, width: 10, height: 10 }}
              />
              {s.label}
            </div>
          ))}
      </div>
    </div>
  );
}

export function MonthlyBars({
  data,
}: {
  data: { label: string; income: number; expense: number }[];
}) {
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.income, d.expense))
  );
  return (
    <div>
      <div className="bar-track">
        {data.map((d, i) => (
          <div className="bar-col" key={i}>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 150, width: "100%", justifyContent: "center" }}>
              <div
                title={`Income ${d.income.toFixed(0)}`}
                style={{
                  width: 14,
                  background: "var(--green)",
                  height: `${(d.income / max) * 100}%`,
                  borderRadius: "3px 3px 0 0",
                  minHeight: d.income > 0 ? 2 : 0,
                }}
              />
              <div
                title={`Expense ${d.expense.toFixed(0)}`}
                style={{
                  width: 14,
                  background: "var(--red)",
                  height: `${(d.expense / max) * 100}%`,
                  borderRadius: "3px 3px 0 0",
                  minHeight: d.expense > 0 ? 2 : 0,
                }}
              />
            </div>
            <span className="bar-lbl">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <div className="legend-item">
          <span className="dot" style={{ background: "var(--green)" }} /> Income
        </div>
        <div className="legend-item">
          <span className="dot" style={{ background: "var(--red)" }} /> Expenses
        </div>
      </div>
    </div>
  );
}
