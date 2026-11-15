import { useState, useEffect } from "react";
import { getTickets } from "./services/ticketServices.ts";
import OfficerView from "./views/OfficerView.tsx";
import AdminView from "./views/AdminView.tsx";
import SellsView from "./views/SellsView.tsx";
import { SAMPLE_TICKETS, type Ticket } from "./data/tickets.ts";
import "./App.css";


type Role = "officer" | "admin" | "sells";

const ROLES: { id: Role; label: string; sub: string }[] = [
  { id: "officer", label: "Officer", sub: "Field Officer Portal" },
  { id: "admin", label: "Admin Officer", sub: "Administrative Control" },
  { id: "sells", label: "Sells Employee", sub: "Sells Review Portal" },
];

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>(SAMPLE_TICKETS);
  const [role, setRole] = useState<Role>("officer");

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await getTickets();
        setTickets(data);
        console.log("Tickets loaded from API:", data);
      } catch (error) {
        console.error("Error loading tickets:", error);
      }
    }

    loadTickets();
  }, []);

  const current = ROLES.find((r) => r.id === role)!;

  return (
    <div className="app-container" style={{ fontFamily: "var(--font-body)" }}>
      {/* Top bar */}
      <header className="app-header">
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
        <div className="app-role-switcher">
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
      <main className="app-main">
        {role === "officer" && <OfficerView tickets={tickets} setTickets={setTickets} />}
        {role === "admin" && <AdminView tickets={tickets} setTickets={setTickets} />}
        {role === "sells" && <SellsView tickets={tickets} setTickets={setTickets} />}
      </main>
    </div>
  );
}
