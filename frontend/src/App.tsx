import { useState } from "react";
import OfficerView from "./views/OfficerView";
import AdminView from "./views/AdminView";
import SellsView from "./views/SellsView";
import { SAMPLE_TICKETS, type Ticket } from "./data/tickets";

type Role = "officer" | "admin" | "sells";

const ROLES: { id: Role; label: string; sub: string }[] = [
  { id: "officer", label: "Officer", sub: "Field Officer Portal" },
  { id: "admin", label: "Admin Officer", sub: "Administrative Control" },
  { id: "sells", label: "Sells Employee", sub: "Sells Review Portal" },
];

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>(SAMPLE_TICKETS);
  const [role, setRole] = useState<Role>("officer");

  const current = ROLES.find((r) => r.id === role)!;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      {/* Top bar */}
      <header
        style={{ background: "var(--color-surface-dark)", borderBottom: "1px solid var(--color-surface-dark-light)" }}
        className="px-6 py-3 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center rounded"
            style={{ background: "var(--color-primary)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#fff" }}
          >
            TMS
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--color-panel)" }}>
              Traffic Management System
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-muted)", letterSpacing: "0.08em" }}>
              SBU Safety &amp; Security
            </div>
          </div>
        </div>

        {/* Role switcher */}
        <div className="flex items-center gap-1" style={{ background: "var(--color-surface-dark-mid)", borderRadius: 6, padding: 3 }}>
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: role === r.id ? 600 : 400,
                fontSize: 12,
                padding: "5px 14px",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                background: role === r.id ? "var(--color-primary)" : "transparent",
                color: role === r.id ? "#fff" : "var(--color-ink-muted)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Current user badge */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-primary)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, color: "#fff" }}
          >
            {current.label[0]}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 12, color: "var(--color-panel)" }}>
              {current.label === "Officer" ? "J. Martinez" : current.label === "Admin Officer" ? "C. Thompson" : "A. Reyes"}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-muted)", letterSpacing: "0.06em" }}>
              {current.sub.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {role === "officer" && <OfficerView tickets={tickets} setTickets={setTickets} />}
        {role === "admin" && <AdminView tickets={tickets} setTickets={setTickets} />}
        {role === "sells" && <SellsView tickets={tickets} setTickets={setTickets} />}
      </main>
    </div>
  );
}
