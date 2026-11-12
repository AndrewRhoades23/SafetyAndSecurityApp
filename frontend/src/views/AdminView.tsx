import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react"
import {
  type Ticket,
  type TicketStatus,
} from "../data/tickets"
import TicketTable from "../components/TicketTable"
import SearchBar from "../components/SearchBar"
import StatusBadge from "../components/StatusBadge"
import Modal from "../components/Modal"
import { createTicket } from "../services/ticketServices.ts"
import { searchVehicles, type Vehicle } from "../services/vehicleService"

type ViolationType = {
  id: number;
  name: string;
  defaultFine: number;
};

type Tab = "submit" | "all" | "review"

function NavBtn({
  id,
  label,
  count,
  tab,
  onSelect,
}: {
  id: Tab
  label: string
  count?: number
  tab: Tab
  onSelect: (id: Tab) => void
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 12px",
        borderRadius: 5,
        border: "none",
        background:
          tab === id
            ? "var(--color-surface-dark-light)"
            : "transparent",
        color: tab === id ? "var(--color-panel)" : "var(--color-slate)",
        fontFamily: "var(--font-display)",
        fontWeight: tab === id ? 600 : 400,
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        width: "100%",
      }}
    >
      <span>{label}</span>

      {count !== undefined && count > 0 && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 10,
            background: "var(--color-primary)",
            color: "#fff",
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--color-ink-mid)",
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 5,
  border: "1px solid var(--color-rule)",
  background: "#fff",
  color: "var(--color-ink)",
  outline: "none",
  width: "100%",
}

const STATUSES: TicketStatus[] = [
  "draft",
  "issued",
  "submitted",
  "flagged",
  "appealed",
]

const OFFICERS = [
  { id: "OFF-003", name: "J. Martinez" },
  { id: "OFF-007", name: "R. Singh" },
  { id: "OFF-012", name: "T. Okafor" },
  { id: "ADM-001", name: "C. Thompson (Admin)" },
]

export default function AdminView({ tickets, setTickets }: {
  tickets: Ticket[]
  setTickets: Dispatch<SetStateAction<Ticket[]>>
}) {
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [violationTypesError, setViolationTypesError] = useState("");
  const [tab, setTab] = useState<Tab>("all")
  const [savingTicket, setSavingTicket] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"newest" | "oldest">("newest")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all")
  const [editing, setEditing] = useState<Ticket | null>(null)
  const [reviewing, setReviewing] = useState<Ticket | null>(null)
  const [flagging, setFlagging] = useState<Ticket | null>(null)
  const [flagNotes, setFlagNotes] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [vehicleMatches, setVehicleMatches] = useState<Vehicle[]>([]);

  const [form, setForm] = useState({
    studentId: "",
    violatorName: "",
    plate: "",
    state: "CA",
    violation: "",
    location: "",
    fine: "",
    make: "",
    color: "",
    notes: "",
    officerId: "ADM-001",
  })

  useEffect(() => {
  async function loadViolationTypes() {
    try {
      const response = await fetch("http://localhost:5168/api/violationtypes");

      if (!response.ok) {
        throw new Error("Failed to load violation types.");
      }

      const data: ViolationType[] = await response.json();
      setViolationTypes(data);
      setViolationTypesError("");

      if (data.length > 0) {
        setForm((prev) => {
          if (prev.violation) return prev;

          return {
            ...prev,
            violation: data[0].name,
            fine: String(data[0].defaultFine),
          };
        });
      }
    } catch (error) {
      console.error("Error loading violation types:", error);
      setViolationTypesError("Unable to load violation types.");
    }
  }

  loadViolationTypes();
}, []);

  
async function saveTicket(status: "draft" | "issued") {
  if (savingTicket) return;

  const officer = OFFICERS.find(
    (o) => o.id === form.officerId
  );

  if (!officer) {
    setSaveError("Please select a valid issuing officer.");
    return;
  }

  setSavingTicket(true);
  setSaveError("");

  try {
    const savedTicket = await createTicket({
      studentId: form.studentId.trim(),
      violatorName: form.violatorName.trim(),
      licensePlate: form.plate.trim(),
      state: form.state.trim(),
      vehicleMake: form.make.trim(),
      vehicleModel: "",
      vehicleColor: form.color.trim(),
      violationType: form.violation,
      location: form.location.trim(),
      fineAmount: Number(form.fine),
      notes: form.notes.trim(),
      officerId: officer.id,
      officerName: officer.name,
      status,
    });

    setTickets((prev) => [savedTicket, ...prev]);

    setForm((prev) => ({
      ...prev,
      studentId: "",
      violatorName: "",
      plate: "",
      location: "",
      fine: "",
      make: "",
      color: "",
      notes: "",
    }));

    setLookupMessage("");
  setVehicleMatches([]);

    setTab("all");
  } catch (error) {
    console.error("Failed to save admin ticket:", error);

    setSaveError(
      error instanceof Error
        ? error.message
        : "Unable to save ticket."
    );
  } finally {
    setSavingTicket(false);
  }
}


async function lookupVehicle() {
  const plate = form.plate.trim();

  if (!plate) {
    setLookupMessage("Enter a license plate first.");
    return;
  }

  setLookupLoading(true);
  setLookupMessage("");
  setVehicleMatches([]);

  try {
    const matches = await searchVehicles(plate);

    if (matches.length === 0) {
      setForm((prev) => ({
        ...prev,
        studentId: "",
        violatorName: "",
        state: "",
        make: "",
        color: "",
      }));

      setLookupMessage(
        "Vehicle not found. Please enter vehicle information manually."
      );
    } else if (matches.length === 1) {
      fillVehicleDetails(matches[0]);
      setLookupMessage("Vehicle found! Information autofilled.");
    } else {
      setVehicleMatches(matches);
      setLookupMessage(
        "Multiple vehicles found. Please select the correct registration."
      );
    }
  } catch (error) {
    console.error(error);
    setLookupMessage("Unable to search vehicles. Please try again.");
  } finally {
    setLookupLoading(false);
  }
}

function fillVehicleDetails(vehicle: Vehicle) {
  setForm((prev) => ({
    ...prev,
    plate: vehicle.licensePlate,
    state: vehicle.state,
    studentId: vehicle.studentId,
    violatorName: vehicle.violatorName,
    make: `${vehicle.vehicleMake} ${vehicle.vehicleModel}`.trim(),
    color: vehicle.vehicleColor,
  }));

  setVehicleMatches([]);
}


  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "resolved"),
    [tickets],
  )

  const filtered = useMemo(() => {
    let list = activeTickets
    if (search.trim()) {
      const q = search.trim().toUpperCase()
      list = list.filter(
        (t) =>
          t.plate.toUpperCase().includes(q) || t.id.toUpperCase().includes(q),
      )
    }
    if (statusFilter !== "all")
      list = list.filter((t) => t.status === statusFilter)
    return [...list].sort((a, b) => {
      const diff =
        new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      return sort === "newest" ? diff : -diff
    })
  }, [search, sort, statusFilter, activeTickets])

  const pending = tickets.filter(
    (t) => t.status === "issued"
  );

  function submitToSells(t: Ticket) {
    const currentTicket = tickets.find((x) => x.id === t.id);

    if (!currentTicket || currentTicket.status !== "issued") {
      setReviewing(null);
      return;
    }

    setTickets((prev) =>
      prev.map((x) =>
        x.id === t.id && x.status === "issued"
          ? { ...x, status: "submitted" }
          : x
      )
    );

    setReviewing(null);
  }

  function flagTicket(t: Ticket, notes: string) {
    setTickets((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? { ...x, status: "flagged", notes: notes || x.notes }
          : x,
      ),
    )
    setFlagging(null)
    setFlagNotes("")
  }

  function saveChanges(t: Ticket) {
    setTickets((prev) => prev.map((x) => x.id === t.id ? t : x))
    setEditing(null)
  }

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const collapseBtn = (
    <button
      onClick={() => setSidebarOpen((v) => !v)}
      title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      style={{
        position: "absolute",
        top: 12,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 4,
        border: "none",
        background: "var(--color-surface-dark-light)",
        color: "var(--color-slate)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        zIndex: 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--color-surface-dark)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "var(--color-surface-dark-light)")
      }
    >
      {sidebarOpen ? "‹" : "›"}
    </button>
  )

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: sidebarOpen ? "220px 1fr" : "48px 1fr",
        minHeight: "calc(100vh - 53px)",
        transition: "grid-template-columns 0.2s ease",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          background: "var(--color-surface-dark-mid)",
          borderRight: "1px solid var(--color-surface-dark-light)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {collapseBtn}
        {sidebarOpen ? (
          <>
            <div
              style={{
                padding: "24px 20px 20px",
                borderBottom: "1px solid var(--color-surface-dark-light)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  color: "var(--color-slate)",
                  marginBottom: 12,
                }}
              >
                ADMIN PORTAL
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "var(--color-panel)",
                }}
              >
                C. Thompson
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-ink-muted)",
                  marginTop: 2,
                }}
              >
                ID: ADM-001
              </div>
            </div>

            <nav
              style={{
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <NavBtn
                id="submit"
                label="Issue Ticket"
                tab={tab}
                onSelect={setTab}
              />

              <NavBtn
                id="all"
                label="All Tickets"
                tab={tab}
                onSelect={setTab}
              />

              <NavBtn
                id="review"
                label="Pending Review"
                count={pending.length}
                tab={tab}
                onSelect={setTab}
              />
            </nav>

            <div style={{ padding: "16px 20px" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-slate)",
                  marginBottom: 8,
                }}
              >
                QUICK STATS
              </div>
              {[
                ["Total Tickets", activeTickets.length],
                [
                  "Submitted",
                  tickets.filter((t) => t.status === "submitted").length,
                ],
                ["Pending Review", pending.length],
                ["Flagged", activeTickets.filter((ticket) => ticket.status === "flagged").length],
              ].map(([label, val]) => (
                <div
                  key={label as string}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-slate)",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-panel)",
                      fontWeight: 600,
                    }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <nav
            style={{
              padding: "44px 8px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "center",
            }}
          >
            {([
              ["submit", "＋", "Issue Ticket"],
              ["all", "☰", "All Tickets"],
              ["review", "◎", "Pending Review"],
            ] as [Tab, string, string][]).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id)
                  setSidebarOpen(true)
                }}
                title={label}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 5,
                  border: "none",
                  background:
                    tab === id ? "var(--color-surface-dark-light)" : "transparent",
                  color:
                    tab === id ? "var(--color-panel)" : "var(--color-slate)",
                  fontSize: 15,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (tab !== id)
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    tab === id ? "var(--color-surface-dark-light)" : "transparent"
                }}
              >
                {icon}
                {id === "review" && pending.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                    }}
                  />
                )}
              </button>
            ))}
          </nav>
        )}
      </aside>

      {/* Content */}
      <div
        style={{
          background: "var(--color-panel)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <nav aria-label="Ticket navigation" className="flex border-b border-rule bg-white px-6">
          {([
            ["submit", "Issue Ticket"],
            ["all", "All Tickets"],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`font-display border-b-2 bg-transparent px-5 py-2 text-sm cursor-pointer transition-colors ${
                tab === id
                  ? "border-amber text-ink font-semibold"
                  : "border-transparent text-ink-muted font-normal"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 24, flex: 1 }}>
          {tab === "submit" && (
            <form style={{ maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); saveTicket("issued") }}>
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "var(--color-ink)",
                  }}
                >
                  Issue New Ticket
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--color-ink-mid)",
                    marginTop: 4,
                  }}
                >
                  Administrative ticket entry.
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Field label="ISSUED BY *">
                  <select
                    value={form.officerId}
                    onChange={(e) =>
                      setForm({ ...form, officerId: e.target.value })
                    }
                    style={inputStyle}
                  >
                    {OFFICERS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} — {o.id}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                <Field label="STUDENT ID">
                  <input
                    aria-label="Student ID"
                    type="text"
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    placeholder="Enter student ID"
                    style={inputStyle}
                  />
                </Field>
                <Field label="VIOLATOR NAME">
                  <input
                    aria-label="Violator name"
                    type="text"
                    value={form.violatorName}
                    onChange={(e) => setForm({ ...form, violatorName: e.target.value })}
                    placeholder="Enter full name"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <Field label="LICENSE PLATE *">
                  <input
                    required
                    value={form.plate}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        plate: e.target.value.toUpperCase(),
                        studentId: "",
                        violatorName: "",
                        state: "",
                        make: "",
                        color: "",
                      }));

                      setLookupMessage("");
                      setVehicleMatches([]);
                    }}
                    placeholder="e.g. ABC-1234"
                    style={{
                      ...inputStyle,
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      letterSpacing: "0.08em",
                    }}
                  />
                  <button
                    type="button"
                    onClick={lookupVehicle}
                    disabled={lookupLoading}
                    style={{
                      ...inputStyle,
                      cursor: lookupLoading ? "wait" : "pointer",
                      background: "var(--color-primary)",
                      color: "#fff",
                      fontWeight: 600,
                      marginTop: 6,
                    }}
                  >
                    {lookupLoading ? "Searching..." : "Search Vehicle"}
                  </button>

                  {lookupMessage && (
                    <p style={{ fontSize: 12, marginTop: 6, color: "var(--color-ink)", }}>
                      {lookupMessage}
                    </p>
                  )}

                  {vehicleMatches.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {vehicleMatches.map((vehicle) => (
                        <button
                          key={vehicle.id}
                          type="button"
                          onClick={() => {
                            fillVehicleDetails(vehicle);
                            setLookupMessage(
                              "Vehicle selected! Information autofilled."
                            );
                          }}
                          style={{
                            ...inputStyle,
                            cursor: "pointer",
                            textAlign: "left",
                            marginBottom: 4,
                          }}
                        >
                          {vehicle.licensePlate} ({vehicle.state}) —{" "}
                          {vehicle.vehicleMake} {vehicle.vehicleModel}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>

                <Field label="STATE *">
                  <input
                    required
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value.toUpperCase() })
                    }
                    maxLength={2}
                    style={{
                      ...inputStyle,
                      fontFamily: "var(--font-mono)",
                      textAlign: "center",
                    }}
                  />
                </Field>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <Field label="VEHICLE MAKE">
                  <input
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    placeholder="e.g. Toyota Camry"
                    style={inputStyle}
                  />
                </Field>
                <Field label="VEHICLE COLOR">
                  <input
                    value={form.color}
                    onChange={(e) =>
                      setForm({ ...form, color: e.target.value })
                    }
                    placeholder="e.g. Silver"
                    style={inputStyle}
                  />
                </Field>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Field label="VIOLATION TYPE *">
                  <select
                    value={form.violation}
                    onChange={(e) => {
                      const selected = violationTypes.find(
                        (v) => v.name === e.target.value
                      );

                      setForm((prev) => ({
                        ...prev,
                        violation: e.target.value,
                        fine: selected
                          ? String(selected.defaultFine)
                          : prev.fine,
                      }));
                    }}
                    disabled={violationTypes.length === 0}
                    style={inputStyle}
                  >
                    {violationTypes.length === 0 && (
                      <option value="">No violations loaded</option>
                    )}

                    {violationTypes.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>

                  {violationTypesError && (
                    <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
                      {violationTypesError}
                    </p>
                  )}
                </Field>

              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <Field label="LOCATION *">
                  <input
                    required
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="Street address and district"
                    style={inputStyle}
                  />
                </Field>
                <Field label="FINE AMOUNT ($) *">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.fine}
                    onChange={(e) => setForm({ ...form, fine: e.target.value })}
                    placeholder="0"
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  />
                </Field>
              </div>
              <div style={{ marginBottom: 20 }}>
                <Field label="NOTES / OBSERVATIONS">
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </Field>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={savingTicket}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "10px 24px",
                    borderRadius: 5,
                    background: "var(--color-primary)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {savingTicket ? "Saving..." : "Issue Ticket"}
                </button>
                <button type="button" onClick={() => saveTicket("draft")} disabled={savingTicket}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: 13,
                    padding: "10px 20px",
                    borderRadius: 5,
                    background: "transparent",
                    color: "var(--color-ink-mid)",
                    border: "1px solid var(--color-rule)",
                    cursor: "pointer",
                  }}
                >
                  Save Draft
                </button>
              </div>

              {saveError && (
                <p
                  role="alert"
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    marginTop: 12,
                  }}
                >
                  {saveError}
                </p>
              )}
            </form>
          )}

          {tab === "all" && (
            <div>
              <div
                style={{
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 20,
                      color: "var(--color-ink)",
                    }}
                  >
                    All Tickets
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--color-ink-mid)",
                      marginTop: 4,
                    }}
                  >
                    Showing {filtered.length} of {activeTickets.length} tickets
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Plate or ticket ID…"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as TicketStatus | "all")
                    }
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      padding: "7px 10px",
                      borderRadius: 5,
                      border: "1px solid var(--color-rule)",
                      background: "#fff",
                      color: "var(--color-ink)",
                      cursor: "pointer",
                    }}
                  >
                    <option value="all">All Statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s === "issued" ? "Pending Review" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sort}
                    onChange={(e) =>
                      setSort(e.target.value as "newest" | "oldest")
                    }
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      padding: "7px 10px",
                      borderRadius: 5,
                      border: "1px solid var(--color-rule)",
                      background: "#fff",
                      color: "var(--color-ink)",
                      cursor: "pointer",
                    }}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 6,
                  border: "1px solid var(--color-rule)",
                  overflow: "hidden",
                }}
              >
                <TicketTable
                  tickets={filtered}
                  onSelect={setEditing}
                  actions={(t) => (
                    <div className="inline-grid w-max grid-flow-col auto-cols-max gap-1.5 whitespace-nowrap">
                      <button
                        className="col-start-1 row-start-1"
                        onClick={() => setEditing(t)}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          padding: "3px 8px",
                          borderRadius: 3,
                          border: "1px solid var(--color-rule)",
                          background: "#fff",
                          color: "var(--color-ink-mid)",
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      {t.status !== "appealed" && (
                        <button
                          type="button"
                          onClick={() => setTickets((prev) =>
                            prev.map((ticket) => ticket.id === t.id
                              ? { ...ticket, status: "appealed" }
                              : ticket),
                          )}
                          className="col-start-2 row-start-1 font-mono text-xs px-2 py-1 rounded border border-status-issued bg-status-issued-soft text-status-issued cursor-pointer"
                        >
                          Appeal
                        </button>
                      )}
                      {t.status !== "flagged" && t.status !== "resolved" && (
                        <button
                          className="col-start-1 row-start-2"
                          onClick={() => {
                            setFlagging(t)
                            setFlagNotes(t.notes ?? "")
                          }}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: "1px solid var(--color-status-flagged)",
                            background: "var(--color-status-flagged-soft)",
                            color: "var(--color-status-flagged)",
                            cursor: "pointer",
                          }}
                        >
                          Flag
                        </button>
                      )}
                      {t.status === "issued" && (
                        <button
                          className="col-start-2 row-start-2"
                          onClick={() => setReviewing(t)}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: "1px solid var(--color-status-submitted)",
                            background: "var(--color-status-submitted-soft)",
                            color: "var(--color-status-submitted)",
                            cursor: "pointer",
                          }}
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {tab === "review" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "var(--color-ink)",
                  }}
                >
                  Pending Review
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--color-ink-mid)",
                    marginTop: 4,
                  }}
                >
                  {pending.length} tickets awaiting admin review before
                  submission to Sells.
                </div>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {pending.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 60,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--color-ink-mid)",
                    }}
                  >
                    No tickets pending review.
                  </div>
                ) : (
                  pending.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        background: "#fff",
                        borderRadius: 6,
                        border: "1px solid var(--color-rule)",
                        padding: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 20,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--color-primary)",
                            fontWeight: 600,
                          }}
                        >
                          {t.id}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            color: "var(--color-ink)",
                            fontWeight: 600,
                          }}
                        >
                          {t.plate}{" "}
                          <span
                            style={{
                              color: "var(--color-ink-mid)",
                              fontWeight: 500,
                            }}
                          >
                            {t.state}
                          </span>
                        </span>
                        <span
                          style={{ fontSize: 13, color: "var(--color-ink)" }}
                        >
                          {t.violation}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--color-ink-mid)",
                          }}
                        >
                          {t.location}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ${t.fine}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => setEditing(t)}
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 500,
                            fontSize: 12,
                            padding: "7px 14px",
                            borderRadius: 5,
                            border: "1px solid var(--color-rule)",
                            background: "#fff",
                            color: "var(--color-ink-mid)",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setReviewing(t)}
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            fontSize: 12,
                            padding: "7px 16px",
                            borderRadius: 5,
                            border: "1px solid var(--color-status-submitted)",
                            background: "var(--color-status-submitted-soft)",
                            color: "var(--color-status-submitted)",
                            cursor: "pointer",
                          }}
                        >
                          Submit to Sells
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <Modal
          title={`Edit Ticket — ${editing.id} — Officer: ${editing.officerName}`}
          onClose={() => setEditing(null)}
          width={620}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <Field label="STUDENT ID">
              <input
                aria-label="Student ID"
                value={editing.studentId ?? ""}
                onChange={(e) => setEditing({ ...editing, studentId: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="VIOLATOR NAME">
              <input
                aria-label="Violator name"
                value={editing.violatorName ?? ""}
                onChange={(e) => setEditing({ ...editing, violatorName: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="LICENSE PLATE">
              <input
                value={editing.plate}
                onChange={(e) => setEditing({ ...editing, plate: e.target.value })}
                style={{
                  ...inputStyle,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                }}
              />
            </Field>
            <Field label="STATE">
              <input
                value={editing.state}
                onChange={(e) => setEditing({ ...editing, state: e.target.value })}
                maxLength={2}
                style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              />
            </Field>
            <Field label="VIOLATION TYPE">
              <select value={editing.violation}
                onChange={(e) => setEditing({ ...editing, violation: e.target.value })} style={inputStyle}>
                {violationTypes.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="FINE AMOUNT ($)">
              <input
                type="number"
                value={editing.fine}
                onChange={(e) => setEditing({ ...editing, fine: Number(e.target.value) })}
                style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              />
            </Field>
            <Field label="LOCATION">
              <input value={editing.location}
                onChange={(e) => setEditing({ ...editing, location: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="STATUS">
              <select value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as TicketStatus })} style={inputStyle}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="NOTES">
            <textarea
              value={editing.notes ?? ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 20,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setEditing(null)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                padding: "9px 18px",
                borderRadius: 5,
                border: "1px solid var(--color-rule)",
                background: "#fff",
                color: "var(--color-ink-mid)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                saveChanges(editing)
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 13,
                padding: "9px 20px",
                borderRadius: 5,
                border: "none",
                background: "var(--color-surface-dark)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Save Changes
            </button>
          </div>
        </Modal>
      )}

      {/* Submit to Sells confirmation */}
      {reviewing && (
        <Modal
          title="Submit to Sells"
          onClose={() => setReviewing(null)}
          width={480}
        >
          <p style={{ fontSize: 14, color: "var(--color-ink)", marginTop: 0 }}>
            You are about to submit ticket{" "}
            <strong style={{ fontFamily: "var(--font-mono)" }}>
              {reviewing.id}
            </strong>{" "}
            (
            <strong style={{ fontFamily: "var(--font-mono)" }}>
              {reviewing.plate}
            </strong>
            ) to the Sells department for processing.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-mid)",
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            Please verify the ticket information below before continuing.
            Confirming will move this ticket from Pending Review to the
            Sells processing queue.
          </p>
          <div
            style={{
              padding: 12,
              background: "var(--color-panel-alt)",
              borderRadius: 5,
              marginBottom: 20,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {[
              ["Student ID", reviewing.studentId || "Not recorded"],
              ["Violator Name", reviewing.violatorName || "Not recorded"],
              ["Violation", reviewing.violation],
              ["Fine", `$${reviewing.fine}`],
              ["Location", reviewing.location],
              ["Officer", reviewing.officerName],
            ].map(([l, v]) => (
              <div key={l as string}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-ink-mid)",
                    fontWeight: 600,
                  }}
                >
                  {l}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-ink)",
                    fontWeight: 500,
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => setReviewing(null)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                padding: "9px 18px",
                borderRadius: 5,
                border: "1px solid var(--color-rule)",
                background: "#fff",
                color: "var(--color-ink-mid)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => submitToSells(reviewing)}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 13,
                padding: "9px 20px",
                borderRadius: 5,
                border: "1px solid var(--color-status-submitted)",
                background: "var(--color-status-submitted-soft)",
                color: "var(--color-status-submitted)",
                cursor: "pointer",
              }}
            >
              Confirm — Submit to Sells
            </button>
          </div>
        </Modal>
      )}

      {/* Flag modal */}
      {flagging && (
        <Modal
          title={`Flag Ticket — ${flagging.id}`}
          onClose={() => {
            setFlagging(null)
            setFlagNotes("")
          }}
          width={480}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 16,
              padding: "10px 12px",
              background: "var(--color-status-flagged-soft)",
              borderRadius: 5,
              border: "1px solid var(--color-status-flagged)",
            }}
          >
            <span style={{ fontSize: 16 }}>⚑</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "var(--color-status-flagged)",
                }}
              >
                {flagging.plate} — {flagging.violation}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-ink-mid)",
                  marginTop: 2,
                }}
              >
                {flagging.id} · {flagging.location}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "var(--color-ink-mid)",
                display: "block",
                marginBottom: 6,
              }}
            >
              FLAG NOTES *
            </label>
            <textarea
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              placeholder="Describe the reason for flagging this ticket…"
              rows={4}
              autoFocus
              style={{
                width: "100%",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 5,
                border: "1px solid var(--color-rule)",
                outline: "none",
                color: "var(--color-ink)",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-status-flagged)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-rule)")}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setFlagging(null)
                setFlagNotes("")
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                padding: "9px 18px",
                borderRadius: 5,
                border: "1px solid var(--color-rule)",
                background: "#fff",
                color: "var(--color-ink-mid)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => flagTicket(flagging, flagNotes)}
              disabled={!flagNotes.trim()}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 13,
                padding: "9px 20px",
                borderRadius: 5,
                border: "1px solid var(--color-rule)",
                background: flagNotes.trim() ? "var(--color-status-flagged-soft)" : "var(--color-panel-alt)",
                color: flagNotes.trim() ? "var(--color-status-flagged)" : "var(--color-ink-muted)",
                cursor: flagNotes.trim() ? "pointer" : "not-allowed",
                transition: "background 0.15s",
              }}
            >
              Flag Ticket
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
