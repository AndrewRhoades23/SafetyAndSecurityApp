import type { Ticket } from "../data/tickets";
import StatusBadge from "./StatusBadge";

interface Props {
  tickets: Ticket[];
  onSelect?: (t: Ticket) => void;
  actions?: (t: Ticket) => React.ReactNode;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function TicketTable({ tickets, onSelect, actions }: Props) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-rule)" }}>
            {["Ticket ID", "License Plate", "Violator", "Violation", "Location", "Fine", "Issued", "Status", ...(actions ? ["Actions"] : [])].map((h) => (
              <th
                key={h}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--color-ink-mid)",
                  letterSpacing: "0.08em",
                  textAlign: "left",
                  padding: "8px 12px",
                  whiteSpace: "nowrap",
                }}
              >
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <tr>
              <td
                colSpan={actions ? 9 : 8}
                style={{
                  textAlign: "center",
                  padding: "40px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--color-ink-muted)",
                }}
              >
                No tickets found.
              </td>
            </tr>
          ) : (
            tickets.map((t, i) => (
              <tr
                key={t.id}
                onClick={() => onSelect?.(t)}
                style={{
                  borderBottom: "1px solid var(--color-rule)",
                  background: i % 2 === 1 ? "var(--color-panel-alt)" : "var(--color-panel)",
                  cursor: onSelect ? "pointer" : "default",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (onSelect) (e.currentTarget as HTMLElement).style.background = "var(--color-panel-alt)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    i % 2 === 1 ? "var(--color-panel-alt)" : "var(--color-panel)";
                }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-primary)", fontWeight: 500 }}>
                    {t.id}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink)", fontWeight: 500 }}>
                    {t.plate}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-mid)", marginLeft: 4 }}>
                    {t.state}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-ink">
                  <div className="text-sm">{t.violatorName || "Not recorded"}</div>
                  <div className="font-mono text-xs text-ink-mid">{t.studentId || "—"}</div>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-ink)" }}>{t.violation}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-ink-mid)" }}>{t.location}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink)", fontWeight: 500 }}>
                    ${t.fine}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--color-ink-mid)", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                  {fmt(t.issuedAt)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <StatusBadge status={t.status} />
                </td>
                {actions && (
                  <td style={{ padding: "10px 12px" }} onClick={(e) => e.stopPropagation()}>
                    {actions(t)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
