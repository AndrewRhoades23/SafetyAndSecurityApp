import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { type Ticket } from "../data/tickets";
import TicketTable from "../components/TicketTable";
import SearchBar from "../components/SearchBar";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";

type DateRange = "all" | "today" | "week" | "month";

function FilterBtn({
  label,
  active,
  onClick,
}: {
  value: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        padding: "5px 12px",
        borderRadius: 4,
        border: `1px solid ${
          active
            ? "var(--color-primary)"
            : "var(--color-rule)"
        }`,
        background: active
          ? "var(--color-primary-soft)"
          : "#fff",
        color: active
          ? "var(--color-primary)"
          : "var(--color-ink-mid)",
        cursor: "pointer",
        transition: "all 0.12s",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  )
}

function isInRange(iso: string, range: DateRange): boolean {
  const now = new Date();
  const d = new Date(iso);
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") {
    const week = new Date(now); week.setDate(now.getDate() - 7);
    return d >= week;
  }
  if (range === "month") {
    const month = new Date(now); month.setMonth(now.getMonth() - 1);
    return d >= month;
  }
  return true;
}

export default function SellsView({ tickets, setTickets }: {
  tickets: Ticket[];
  setTickets: Dispatch<SetStateAction<Ticket[]>>;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sellsTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "submitted"),
    [tickets],
  );
  const selected = sellsTickets.find((ticket) => ticket.id === selectedId);

  function markAsDone(ticket: Ticket) {
    setTickets((previous) => previous.map((item) =>
      item.id === ticket.id && item.status === "submitted"
        ? { ...item, status: "resolved" }
        : item,
    ));
    setSelectedId(null);
  }

  const filtered = useMemo(() => {
    let list = sellsTickets;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((t) => t.plate.toUpperCase().includes(q) || t.id.toUpperCase().includes(q));
    }
    list = list.filter((t) => isInRange(t.issuedAt, dateRange));
    return [...list].sort((a, b) => {
      const diff = new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
      return sort === "newest" ? diff : -diff;
    });
  }, [search, sort, dateRange, sellsTickets]);

  const totalFine = filtered.reduce((s, t) => s + t.fine, 0);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: "grid", gridTemplateColumns: sidebarOpen ? "220px 1fr" : "48px 1fr", minHeight: "calc(100vh - 53px)", transition: "grid-template-columns 0.2s ease" }}>
      {/* Sidebar */}
      <aside style={{ background: "var(--color-surface-dark-mid)", borderRight: "1px solid var(--color-surface-dark-light)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          style={{
            position: "absolute", top: 12, right: 8,
            width: 24, height: 24, borderRadius: 4, border: "none",
            background: "var(--color-surface-dark-light)", color: "var(--color-slate)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, zIndex: 1, transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-dark)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-surface-dark-light)")}
        >
          {sidebarOpen ? "‹" : "›"}
        </button>

        {sidebarOpen ? (
          <>
            <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--color-surface-dark-light)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--color-slate)", marginBottom: 12 }}>
                SELLS PORTAL
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--color-panel)" }}>
                A. Reyes
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-muted)", marginTop: 2 }}>ID: SLS-009</div>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-slate)", marginBottom: 10 }}>QUEUE SUMMARY</div>
              {[
                ["Submitted", sellsTickets.length, "var(--color-primary-light)"],
              ].map(([label, val, color]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-slate)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: color as string }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--color-surface-dark-light)", paddingTop: 16 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-slate)", marginBottom: 8 }}>TOTAL FINES (VIEW)</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--color-primary-light)" }}>
                ${totalFine.toLocaleString()}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-muted)", marginTop: 2 }}>
                {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: "44px 8px 16px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {[
              ["Submitted", sellsTickets.length, "var(--color-primary-light)"],
            ].map(([label, val, color]) => (
              <div key={label as string} title={`${label}: ${val}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: color as string }}>{val}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--color-slate)", letterSpacing: "0.06em" }}>{(label as string).slice(0, 3).toUpperCase()}</span>
              </div>
            ))}
            <div style={{ marginTop: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-primary-light)", fontWeight: 700 }} title={`Total fines: $${totalFine.toLocaleString()}`}>
              $
            </div>
          </div>
        )}
      </aside>

      {/* Content */}
      <div style={{ background: "var(--color-panel)" }}>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--color-ink)" }}>
              Submitted Tickets
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-mid)", marginTop: 4 }}>
              Review and process tickets submitted by Administrative Officers.
            </div>
          </div>

          {/* Filters */}
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid var(--color-rule)", padding: "14px 16px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Plate or ticket ID…" />

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-mid)", fontWeight: 600, letterSpacing: "0.06em" }}>PERIOD</span>
              {(["all", "today", "week", "month"] as DateRange[]).map((r) => (
                <FilterBtn
                  key={r}
                  value={r}
                  label={{ all: "All Time", today: "Today", week: "7 Days", month: "30 Days" }[r]}
                  active={dateRange === r}
                  onClick={() => setDateRange(r)}
                />
              ))}
            </div>

            <div style={{ marginLeft: "auto" }}>
              <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "6px 10px", borderRadius: 5, border: "1px solid var(--color-rule)", background: "#fff", color: "var(--color-ink)", cursor: "pointer" }}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid var(--color-rule)", overflow: "hidden" }}>
            <TicketTable
              tickets={filtered}
              onSelect={(ticket) => setSelectedId(ticket.id)}
              actions={(ticket) => (
                <button
                  type="button"
                  onClick={() => markAsDone(ticket)}
                  className="min-w-max whitespace-nowrap font-mono text-xs px-3 py-2 rounded bg-primary text-white cursor-pointer"
                >
                  Mark as Done
                </button>
              )}
            />
          </div>
        </div>
      </div>

      {selected && (
        <Modal title={`Review Ticket — ${selected.id}`} onClose={() => setSelectedId(null)} width={600}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[
              ["Ticket ID", selected.id],
              ["Student ID", selected.studentId || "Not recorded"],
              ["Violator Name", selected.violatorName || "Not recorded"],
              ["License Plate", `${selected.plate} (${selected.state})`],
              ["Vehicle", `${selected.vehicleColor ?? "—"} ${selected.vehicleMake ?? "—"}`],
              ["Violation", selected.violation],
              ["Fine Amount", `$${selected.fine}`],
              ["Location", selected.location],
              ["Issued By", selected.officerName],
              ["Issue Date", new Date(selected.issuedAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-mid)", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                <div style={{
                  fontFamily: ["Ticket ID", "License Plate"].includes(label as string) ? "var(--font-mono)" : "var(--font-body)",
                  fontSize: 13, color: "var(--color-ink)", fontWeight: 500,
                }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: selected.notes ? 16 : 0, padding: "10px 12px", background: "var(--color-panel-alt)", borderRadius: 5 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-mid)", fontWeight: 600 }}>STATUS</span>
            <StatusBadge status={selected.status} />
          </div>

          {selected.notes && (
            <div style={{ marginTop: 12, padding: 12, background: "var(--color-panel-alt)", borderRadius: 5, borderLeft: "3px solid var(--color-primary)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-mid)", fontWeight: 600, marginBottom: 4 }}>OFFICER NOTES</div>
              <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{selected.notes}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button onClick={() => setSelectedId(null)}
              style={{ fontFamily: "var(--font-display)", fontSize: 13, padding: "9px 18px", borderRadius: 5, border: "1px solid var(--color-rule)", background: "#fff", color: "var(--color-ink-mid)", cursor: "pointer" }}>
              Close
            </button>
            <button
              type="button"
              onClick={() => markAsDone(selected)}
              className="font-display font-semibold text-sm px-5 py-2 rounded bg-primary text-white cursor-pointer"
            >
              Mark as Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
