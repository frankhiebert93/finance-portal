import React from "react";

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconDashboard = (p: any) => (
  <svg {...base} className={"nav-ico " + (p.className || "")}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const IconWallet = (p: any) => (
  <svg {...base} className={"nav-ico " + (p.className || "")}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5" />
    <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconList = (p: any) => (
  <svg {...base} className={"nav-ico " + (p.className || "")}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconBudget = (p: any) => (
  <svg {...base} className={"nav-ico " + (p.className || "")}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v9l6 3" />
  </svg>
);

export const IconGoal = (p: any) => (
  <svg {...base} className={"nav-ico " + (p.className || "")}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconReport = (p: any) => (
  <svg {...base} className={"nav-ico " + (p.className || "")}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const IconSettings = (p: any) => (
  <svg {...base} className={"nav-ico " + (p.className || "")}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 14 1.65 1.65 0 0 0 2.09 12H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 6.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 2.6 1.65 1.65 0 0 0 10 1.09V1a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 2.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21.4 8H21a2 2 0 0 1 0 4h.09" />
  </svg>
);

export const IconPlus = (p: any) => (
  <svg {...base} width={p.size || 18} height={p.size || 18}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconUpload = (p: any) => (
  <svg {...base} width={p.size || 18} height={p.size || 18}>
    <path d="M12 15V3m0 0L8 7m4-4 4 4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconMenu = (p: any) => (
  <svg {...base} width={22} height={22}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const IconTrend = (p: any) => (
  <svg {...base} width={p.size || 18} height={p.size || 18}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M17 7h4v4" />
  </svg>
);
