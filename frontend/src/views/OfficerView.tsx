import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react"
import { type Ticket, type TicketStatus } from "../data/tickets"
import { searchVehicles, type Vehicle } from "../services/vehicleService"
import TicketTable from "../components/TicketTable"
import SearchBar from "../components/SearchBar"
import StatusBadge from "../components/StatusBadge"
import Modal from "../components/Modal"
import { getViolationTypes, type ViolationType } from "../services/violationtypeService"
import { createTicket, updateTicket } from "../services/ticketServices.ts";
import "../OfficerView.css"
import MultiViolationSelector from "../components/MultiViolationSelector";
import {
  buildTicketNotes,
  readTicketNotes,
} from "../utils/multiViolationNotes";

type Tab = "submit" | "tickets"
type Sort = "newest" | "oldest" | "status"

const OFFICER_STATUSES: TicketStatus[] = ["draft", "issued", "flagged"]

function TabBtn({
  id,
  label,
  tab,
  onSelect,
}: {
  id: Tab
  label: string
  tab: Tab
  onSelect: (id: Tab) => void
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: tab === id ? 600 : 400,
        fontSize: 13,
        padding: "8px 20px",
        border: "none",
        borderBottom:
          tab === id
            ? "2px solid var(--color-primary)"
            : "2px solid transparent",
        background: "transparent",
        color:
          tab === id
            ? "var(--color-ink)"
            : "var(--color-ink-muted)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
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

const OFFICER_ID = "OFF-003"

function canIssueDraft(ticket: Ticket) {
  return (
    ticket.status === "draft" &&
    ticket.officerId === OFFICER_ID
  )
}

function canEditTicket(ticket: Ticket) {
  return ticket.officerId === OFFICER_ID &&
    ["draft", "issued", "flagged"].includes(ticket.status)
}

export default function OfficerView({ tickets, setTickets }: {
  tickets: Ticket[]
  setTickets: Dispatch<SetStateAction<Ticket[]>>
}) {
  const [tab, setTab] = useState<Tab>("tickets")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<Sort>("newest")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all")
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [myOnly, setMyOnly] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editError, setEditError] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [vehicleMatches, setVehicleMatches] = useState<Vehicle[]>([]);
  const editingTicket = tickets.find((ticket) => ticket.id === editingId)
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [violationTypesError, setViolationTypesError] = useState("");
  const [savingTicket, setSavingTicket] = useState(false);
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    studentId: "",
    violatorName: "",
    plate: "",
    state: "CA",
    violation: "",
    location: "",
    fine: "",
    make: "",
    model: "",
    color: "",
    notes: "",
  })

  useEffect(() => {
  async function loadViolationTypes() {
    try {
      const types = await getViolationTypes();
      setViolationTypes(types);
      setViolationTypesError("");
    } catch (error) {
      console.error(error);
      setViolationTypesError("Unable to load violation types.");
    }
  }

  loadViolationTypes();
}, []);


  function resetForm() {
    setForm({
      studentId: "",
      violatorName: "",
      plate: "",
      state: "CA",
      violation: "",
      location: "",
      fine: "",
      make: "",
      model: "",
      color: "",
      notes: "",
    });

    setSelectedViolations([]);
    setEditingId(null);
    setEditError("");
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
        model: "",
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
      make: vehicle.vehicleMake,
      model: vehicle.vehicleModel,
      color: vehicle.vehicleColor,
    }));

    setVehicleMatches([]);
  }


  function navigateTab(next: Tab) {
    if (editingId) resetForm()
    setTab(next)
  }

  function startEditing(ticket: Ticket) {
    if (!canEditTicket(ticket)) return
    setEditingId(ticket.id);

    setEditError("");
    const restored = readTicketNotes(
    ticket.notes ?? "",
    ticket.violation
    );

    setSelectedViolations(restored.selectedViolations);

    setForm({
      studentId: ticket.studentId ?? "",
      violatorName: ticket.violatorName ?? "",
      plate: ticket.plate,
      state: ticket.state,
      violation: ticket.violation,
      location: ticket.location,
      fine: String(ticket.fine),
      make: ticket.vehicleMake ?? "",
      model: ticket.vehicleModel ?? "",
      color: ticket.vehicleColor ?? "",
      notes: restored.officerNotes,
    })
    setSelected(null)
    setTab("submit")
  }

async function saveTicket(status: "draft" | "issued") {
  const details = {
    studentId: form.studentId.trim(),
    violatorName: form.violatorName.trim(),
    plate: form.plate.trim(),
    state: form.state.trim(),
    violation: form.violation,
    location: form.location.trim(),
    fine: Number(form.fine),
    vehicleMake: form.make.trim(),
    vehicleModel: form.model.trim(),
    vehicleColor: form.color.trim(),
    notes: buildTicketNotes(
      selectedViolations,
      violationTypes,
      form.notes
    ),
  };

  if (status === "issued" && selectedViolations.length === 0) {
    setEditError("Please select at least one violation.");
    return;
  }

  // Existing tickets are still edited locally for now.
  
if (editingId) {
  if (!editingTicket || !canEditTicket(editingTicket)) {
    setEditError("This ticket is no longer available for you to edit.");
    return;
  }
  if (
    editingTicket.status === "draft" &&
    status === "issued" &&
    !canIssueDraft(editingTicket)
  ) {
    setEditError("Only the officer who created this draft can issue it.");
    return;
  }

  if (savingTicket) return;

  setSavingTicket(true);
  setEditError("");

  try {
    const updatedTicket = await updateTicket(editingId, {
      studentId: details.studentId,
      violatorName: details.violatorName,
      licensePlate: details.plate,
      state: details.state,
      vehicleMake: details.vehicleMake,
      vehicleModel: details.vehicleModel,
      vehicleColor: details.vehicleColor,
      violationType: details.violation,
      location: details.location,
      fineAmount: details.fine,
      notes: details.notes,
      officerId: editingTicket.officerId,
      officerName: editingTicket.officerName,
      status: editingTicket.status === "draft"
        ? status
        : "issued",
    });

    // Replace the existing ticket in React state.
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === editingId ? updatedTicket : ticket
      )
    );

    resetForm();
    setTab("tickets");
  } catch (error) {
    console.error(error);

    setEditError(
      error instanceof Error
        ? error.message
        : "Unable to update ticket."
    );
  } finally {
    setSavingTicket(false);
  }

  return;
}


  // Prevent duplicate submissions.
  if (savingTicket) return;

  setSavingTicket(true);
  setEditError("");

  try {
    // Save drafts and issued tickets to SQLite.
    const savedTicket = await createTicket({
      studentId: details.studentId,
      violatorName: details.violatorName,
      licensePlate: details.plate,
      state: details.state,
      vehicleMake: details.vehicleMake,
      vehicleModel: details.vehicleModel,
      vehicleColor: details.vehicleColor,
      violationType: details.violation,
      location: details.location,
      fineAmount: details.fine,
      notes: details.notes,
      officerId: OFFICER_ID,
      officerName: "J. Martinez",
      status,
    });

    setTickets((prev) => [savedTicket, ...prev]);

    resetForm();
    setTab("tickets");
  } catch (error) {
    console.error(error);

    setEditError(
      error instanceof Error
        ? error.message
        : "Unable to save ticket."
    );
  } finally {
    setSavingTicket(false);
  }
}


  const filtered = useMemo(() => {
    let list = tickets.filter((t) =>
      OFFICER_STATUSES.includes(t.status),
    )
    if (myOnly) list = list.filter((t) => t.officerId === OFFICER_ID)
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toUpperCase()
      list = list.filter(
        (t) =>
          t.plate.toUpperCase().includes(q) || t.id.toUpperCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
      if (sort === "status") {
        const statusDiff = OFFICER_STATUSES.indexOf(a.status) - OFFICER_STATUSES.indexOf(b.status)
        if (statusDiff !== 0) return statusDiff
      }
      const diff =
        new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      return sort === "oldest" ? -diff : diff
    })
  }, [search, sort, statusFilter, myOnly, tickets])

  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div
      className="officer-layout"
      style={{
        gridTemplateColumns: sidebarOpen ? "220px minmax(0, 1fr)" : "48px minmax(0, 1fr)",
      }}
    >
      {/* Sidebar */}
      <aside className="officer-sidebar">
        {/* Collapse toggle */}
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
            flexShrink: 0,
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
                OFFICER PORTAL
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "var(--color-panel)",
                }}
              >
                J. Martinez
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-ink-muted)",
                  marginTop: 2,
                }}
              >
                ID: OFF-003
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
              {([
                ["submit", "Issue Ticket"],
                ["tickets", "All Tickets"],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => navigateTab(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 5,
                    border: "none",
                    background:
                      tab === id ? "var(--color-surface-dark-light)" : "transparent",
                    color:
                      tab === id ? "var(--color-panel)" : "var(--color-slate)",
                    fontFamily: "var(--font-display)",
                    fontWeight: tab === id ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 15 }}>
                    {id === "submit" ? "＋" : "☰"}
                  </span>
                  {label}
                </button>
              ))}
            </nav>
          </>
        ) : (
          /* Collapsed: icon-only nav */
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
              ["tickets", "☰", "All Tickets"],
            ] as [Tab, string, string][]).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => {
                  navigateTab(id)
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
              </button>
            ))}
          </nav>
        )}
      </aside>

      {/* Content */}
        <div className="officer-content">
        {/* Tab bar */}
        <div
          style={{
            borderBottom: "1px solid var(--color-rule)",
            padding: "0 24px",
            background: "#fff",
            display: "flex",
            gap: 0,
          }}
        >
          <TabBtn
            id="submit"
            label="Issue Ticket"
            tab={tab}
            onSelect={navigateTab}
          />

          <TabBtn
            id="tickets"
            label="All Tickets"
            tab={tab}
            onSelect={navigateTab}
          />
        </div>

        <div className="officer-page-content">
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
                  {editingId ? `Edit Ticket — ${editingId}` : "Issue New Ticket"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--color-ink-mid)",
                    marginTop: 4,
                    letterSpacing: "0.04em",
                  }}
                >
                  {editingTicket?.status === "draft"
                    ? "Complete your draft and issue the ticket when ready."
                    : editingId
                      ? "Update your ticket details."
                      : "Complete all required fields before submission."}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Field label="ISSUED BY">
                  <div
                    style={{
                      ...inputStyle,
                      background: "var(--color-panel-alt)",
                      color: "var(--color-ink-mid)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "default",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--color-primary)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 10,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      JM
                    </span>
                    <span>J. Martinez</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--color-ink-mid)",
                        marginLeft: 4,
                      }}
                    >
                      OFF-003
                    </span>
                  </div>
                </Field>
              </div>

              <div className="officer-form-grid">
                <Field label="STUDENT ID">
                  <input
                    aria-label="Student ID"
                    type="text"
                    value={form.studentId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        studentId: e.target.value,
                      }))
                    }
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

              <div className="officer-form-grid officer-plate-grid">
                <Field label="LICENSE PLATE *">
                  <input
                    required={!editingId || editingTicket?.status !== "draft"}
                    value={form.plate}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        plate: e.target.value.toUpperCase(),
                        studentId: "",
                        violatorName: "",
                        state: "",
                        make: "",
                        model: "",
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
                            setLookupMessage("Vehicle selected! Information autofilled.");
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
                    required={!editingId || editingTicket?.status !== "draft"}
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

              <div className="officer-form-grid">
                <Field label="VEHICLE MAKE">
                  <input
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    placeholder="e.g. Toyota"
                    style={inputStyle}
                  />
                </Field>
                <Field label="VEHICLE MODEL">
                  <input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="e.g. Camry"
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
                <MultiViolationSelector
                  violationTypes={violationTypes}
                  selectedViolations={selectedViolations}
                  onChange={(violations) => {
                    setSelectedViolations(violations);

                    const selectedTypes = violationTypes.filter((type) =>
                      violations.includes(type.name)
                    );

                    const total = selectedTypes.reduce(
                      (sum, type) => sum + type.defaultFine,
                      0
                    );

                    setForm((prev) => ({
                      ...prev,
                      violation: selectedTypes[0]?.name ?? "",
                      fine: violations.length > 0 ? String(total) : "",
                    }));
                  }}
                />

                {violationTypesError && (
                  <p role="alert" style={{ color: "red", fontSize: 12 }}>
                    {violationTypesError}
                  </p>
                )}
              </div>

              <div className="officer-form-grid officer-location-grid">
                <Field label="LOCATION *">
                  <input
                    required={!editingId || editingTicket?.status !== "draft"}
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
                    required={!editingId || editingTicket?.status !== "draft"}
                    value={form.fine}
                    onChange={(e) => setForm({ ...form, fine: e.target.value })}
                    placeholder="0"
                    style={{
                      ...inputStyle,
                      fontFamily: "var(--font-mono)",
                      background: "var(--color-panel-alt)",
                      cursor: "default",
                    }}
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
                    placeholder="Additional context, photos referenced, witness info…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </Field>
              </div>

              {editError && <p role="alert" className="text-warning text-sm mb-3">{editError}</p>}
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
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {savingTicket
                    ? "Saving..."
                    : editingId && editingTicket?.status !== "draft"
                      ? "Save Changes"
                      : "Issue Ticket"}
                </button>
                <button
                  type="button"
                  disabled={savingTicket}
                  onClick={() => {
                    if (editingId && editingTicket?.status !== "draft") {
                      resetForm();
                      setTab("tickets");
                    } else {
                      saveTicket("draft");
                    }
                  }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: 13,
                    padding: "10px 20px",
                    borderRadius: 5,
                    background: "transparent",
                    color: "var(--color-ink-muted)",
                    border: "1px solid var(--color-rule)",
                    cursor: "pointer",
                  }}
                >
                {savingTicket
                  ? "Saving..."
                  : editingId && editingTicket?.status !== "draft"
                    ? "Cancel"
                    : "Save Draft"}
                </button>
              </div>
            </form>
          )}

          {tab === "tickets" && (
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
                    {myOnly ? "My Tickets" : "All Tickets"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--color-ink-mid)",
                      marginTop: 4,
                    }}
                  >
                    {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
                    {myOnly ? " — Officer J. Martinez" : " across all officers"}
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
                  {/* My tickets toggle */}
                  <button
                    onClick={() => setMyOnly((v) => !v)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      padding: "6px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "all 0.12s",
                      border: `1px solid ${
                        myOnly ? "var(--color-primary)" : "var(--color-rule)"
                      }`,
                      background: myOnly ? "var(--color-primary-soft)" : "#fff",
                      color: myOnly
                        ? "var(--color-primary)"
                        : "var(--color-ink-muted)",
                      fontWeight: myOnly ? 600 : 400,
                    }}
                  >
                    My Tickets Only
                  </button>
                  <select
                    aria-label="Filter tickets by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
                    className="font-mono text-xs px-3 py-2 rounded border border-rule bg-white text-ink cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    {OFFICER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status === "issued" ? "Pending Review" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Sort tickets"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
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
                    <option value="status">Status: Draft → Pending Review → Flagged</option>
                  </select>
                </div>
              </div>

              <div className="officer-desktop-tickets">
                <TicketTable
                  tickets={filtered}
                  onSelect={setSelected}
                  actions={(ticket) => canEditTicket(ticket) ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => startEditing(ticket)}
                        className="font-mono text-xs px-2 py-1 rounded border border-rule bg-white text-ink-mid cursor-pointer"
                      >
                        Edit
                      </button>

                      {canIssueDraft(ticket) && (
                        <button
                          type="button"
                          onClick={() => startEditing(ticket)}
                          className="font-mono text-xs px-2 py-1 rounded cursor-pointer"
                          style={{
                            border: "1px solid var(--color-primary)",
                            background: "var(--color-primary-soft)",
                            color: "var(--color-primary)",
                          }}
                        >
                          Issue
                        </button>
                      )}
                    </div>
                  ) : null}
                />
              </div>     
              <div className="officer-mobile-tickets">
                {filtered.length === 0 ? (
                  <p>No tickets found.</p>
                ) : (
                  filtered.map((ticket) => (
                    <details
                      key={ticket.id}
                      style={{
                        background: "#fff",
                        border: "1px solid var(--color-rule)",
                        borderRadius: 6,
                        padding: 14,
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Ticket #{ticket.id} — {ticket.plate}
                      </summary>

                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gridTemplateColumns: "1fr",
                          gap: 10,
                          fontSize: 13,
                        }}
                      >
                        {[
                          ["Student ID", ticket.studentId],
                          ["Violator Name", ticket.violatorName],
                          ["License Plate State", ticket.state],
                          ["Vehicle Make", ticket.vehicleMake],
                          ["Vehicle Model", ticket.vehicleModel],
                          ["Vehicle Color", ticket.vehicleColor],
                          ["Violation", ticket.violation],
                          ["Location", ticket.location],
                          ["Fine", `$${ticket.fine.toFixed(2)}`],
                          ["Date Issued", new Date(ticket.issuedAt).toLocaleString()],
                          ["Officer", ticket.officerName],
                          ["Officer ID", ticket.officerId],
                          ["Status", ticket.status],
                          ["Notes", ticket.notes],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "var(--color-ink-mid)",
                                marginBottom: 3,
                              }}
                            >
                              {label}
                            </div>
                            <div>{value || "Not recorded"}</div>
                          </div>
                        ))}

                        {canEditTicket(ticket) && (
                          <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 8,
                          }}>
                            <button
                              type="button"
                              onClick={() => startEditing(ticket)}
                              style={{
                                padding: "12px 16px",
                                background: "var(--color-primary)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 5,
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Edit Ticket
                            </button>

                            {canIssueDraft(ticket) && (
                              <button
                                type="button"
                                onClick={() => startEditing(ticket)}
                                style={{
                                  padding: "12px 16px",
                                  border: "1px solid var(--color-primary)",
                                  background: "var(--color-primary-soft)",
                                  color: "var(--color-primary)",
                                  borderRadius: 5,
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                Issue Ticket
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  ))
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {selected && (
        <Modal
          title={`Ticket ${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {[
              ["Student ID", selected.studentId || "Not recorded"],
              ["Violator Name", selected.violatorName || "Not recorded"],
              ["Plate", `${selected.plate} (${selected.state})`],
              [
                "Vehicle",
                `${selected.vehicleColor ?? "—"} ${selected.vehicleMake ?? "—"} ${selected.vehicleModel ?? "—"}`,
              ],
              ["Violation", selected.violation],
              ["Fine", `$${selected.fine}`],
              ["Location", selected.location],
              ["Issued", new Date(selected.issuedAt).toLocaleString()],
              ["Officer", selected.officerName],
              ["Status", ""],
            ].map(([label, value]) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-ink-mid)",
                    letterSpacing: "0.08em",
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                {label === "Status" ? (
                  <StatusBadge status={selected.status} />
                ) : (
                  <div
                    style={{
                      fontFamily:
                        label === "Plate"
                          ? "var(--font-mono)"
                          : "var(--font-body)",
                      fontSize: 13,
                      color: "var(--color-ink)",
                      fontWeight: 500,
                    }}
                  >
                    {value}
                  </div>
                )}
              </div>
            ))}
          </div>
          {selected.notes && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "var(--color-panel-alt)",
                borderRadius: 5,
                borderLeft: "3px solid var(--color-primary)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-ink-mid)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                NOTES
              </div>
              <div style={{ fontSize: 13, color: "var(--color-ink)" }}>
                {selected.notes}
              </div>
            </div>
          )}
          {canEditTicket(selected) && (
            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => startEditing(selected)}
                className="font-display font-semibold text-sm px-5 py-2 rounded bg-navy text-white cursor-pointer"
              >
                Edit Ticket
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}