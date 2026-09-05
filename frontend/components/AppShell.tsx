"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DataProvider from "./DataProvider";
import {
  IconDashboard,
  IconWallet,
  IconList,
  IconBudget,
  IconGoal,
  IconReport,
  IconSettings,
  IconMenu,
  IconDebt,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/accounts", label: "Accounts", Icon: IconWallet },
  { href: "/transactions", label: "Transactions", Icon: IconList },
  { href: "/budgets", label: "Budgets", Icon: IconBudget },
  { href: "/debts", label: "Debts", Icon: IconDebt },
  { href: "/goals", label: "Savings Goals", Icon: IconGoal },
  { href: "/reports", label: "Reports", Icon: IconReport },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "Accounts",
  "/transactions": "Transactions",
  "/budgets": "Budgets",
  "/debts": "Debts",
  "/goals": "Savings Goals",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function AppShell({
  user,
  children,
}: {
  user: { email: string; name: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const title = TITLES[pathname] || "Finance Portal";
  const initials =
    (user.name || user.email || "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "F";

  return (
    <div className="app-shell">
      <aside className={"sidebar" + (open ? " open" : "")}>
        <div className="sidebar-brand">
          <span className="brand-mark">F</span>
          Finance Portal
        </div>
        <nav className="nav">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{initials}</span>
            <div className="who">
              <div className="nm">{user.name || "Signed in"}</div>
              <div className="em">{user.email}</div>
            </div>
          </div>
          <form action="/auth/signout" method="post" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm btn-block" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div
        className={"sidebar-backdrop" + (open ? " show" : "")}
        onClick={() => setOpen(false)}
      />

      <div className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-ghost btn-sm mobile-menu-btn"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              <IconMenu />
            </button>
            <h1>{title}</h1>
          </div>
        </header>
        <main className="content">
          <DataProvider>{children}</DataProvider>
        </main>
      </div>
    </div>
  );
}
