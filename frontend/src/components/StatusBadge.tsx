import type { TicketStatus } from "../data/tickets";

const CONFIG: Record<TicketStatus, { label: string; bg: string; color: string }> = {
  draft:     { label: "DRAFT",     bg: "var(--color-status-draft-soft)", color: "var(--color-status-draft)" },
  issued:    { label: "PENDING REVIEW", bg: "var(--color-status-issued-soft)", color: "var(--color-status-issued)" },
  submitted: { label: "SUBMITTED", bg: "var(--color-status-submitted-soft)", color: "var(--color-status-submitted)" },
  flagged:   { label: "FLAGGED",   bg: "var(--color-status-flagged-soft)", color: "var(--color-status-flagged)" },
  appealed:  { label: "APPEALED",  bg: "var(--color-primary-soft)", color: "var(--color-primary)" },
  resolved:  { label: "RESOLVED",  bg: "var(--color-panel-alt)", color: "var(--color-ink-mid)" },
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  const c = CONFIG[status];
  return (
    <span
      className="inline-block whitespace-nowrap shrink-0"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
        padding: "2px 8px",
        borderRadius: 3,
        background: c.bg,
        color: c.color,
      }}
    >
      {c.label}
    </span>
  );
}
