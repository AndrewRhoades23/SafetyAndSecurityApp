import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react"
import {
  type Ticket,
  type TicketStatus,
} from "../data/tickets"
import TicketTable from "../components/TicketTable"
import SearchBar from "../components/SearchBar"
/* import StatusBadge from "../components/StatusBadge" */
import Modal from "../components/Modal"
import { createTicket, updateTicket } from "../services/ticketServices.ts"
import { searchVehicles, type Vehicle } from "../services/vehicleService"
import "../AdminView.css"
import MultiViolationSelector from "../components/MultiViolationSelector";
import {
  buildTicketNotes,
  readTicketNotes,
} from "../utils/multiViolationNotes";

type ViolationType = {
  id: number;
  name: string;
  defaultFine: number;
};

type Tab = "submit" | "all"

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
  "reviewed",
  "submitted",
  "flagged",
  "appealed",
]

const ADMIN_ID = "ADM-001";

const APPEAL_PERIOD_DAYS = 10;

const APPEAL_PERIOD_MS =
  APPEAL_PERIOD_DAYS * 24 * 60 * 60 * 1000;

function getAppealDeadline(ticket: Ticket): number {
  const issuedAt = ticket.issuedAt;

  const utcDate = /(?:Z|[+-]\d{2}:\d{2})$/i.test(issuedAt)
    ? issuedAt
    : `${issuedAt}Z`;

  return new Date(utcDate).getTime() + APPEAL_PERIOD_MS;
}

function canSubmitToSells(
  ticket: Ticket,
  now: number = Date.now()
): boolean {
  return (
    ticket.status === "reviewed" &&
    now >= getAppealDeadline(ticket)
  );
}

function getAppealTimeRemaining(
  ticket: Ticket,
  now: number
): string {
  const remaining = getAppealDeadline(ticket) - now;

  if (!Number.isFinite(remaining)) {
    return "Invalid issuance date";
  }

  if (remaining <= 0) {
    return "Appeal period expired";
  }

  const totalMinutes = Math.ceil(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return `${days}d ${hours}h ${minutes}m remaining`;
}

function canIssueDraft(ticket: Ticket) {
  return (
    ticket.status === "draft" &&
    ticket.createdById === ADMIN_ID
  );
}

function canEditTicket(ticket: Ticket) {
  if (ticket.status === "draft") {
    return ticket.createdById === ADMIN_ID;
  }

  return ["issued", "flagged", "submitted"].includes(ticket.status);
}

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
  const [now, setNow] = useState(Date.now());
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"newest" | "oldest">("newest")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all")
  const [editing, setEditing] = useState<Ticket | null>(null)
  const [editSelectedViolations, setEditSelectedViolations] =
    useState<string[]>([]);
  const [editOfficerNotes, setEditOfficerNotes] = useState("");
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
    state: "",
    violation:"",
    location: "",
    fine: "",
    make: "",
    model: "",
    color: "",
    notes: "",
    officerId: "ADM-001",
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

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

    } catch (error) {
      console.error("Error loading violation types:", error);
      setViolationTypesError("Unable to load violation types.");
    }
  }

  loadViolationTypes();
}, []);

  
async function saveTicket(status: "draft" | "issued") {
  if (savingTicket) return;

  if (status === "issued" && selectedViolations.length === 0) {
    setSaveError("Please select at least one violation.");
    return;
  }

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
      vehicleModel: form.model.trim(),
      vehicleColor: form.color.trim(),
      violationType: selectedViolations.join("; "),
      location: form.location.trim(),
      fineAmount: Number(form.fine),
      notes: buildTicketNotes(
        selectedViolations,
        violationTypes,
        form.notes
      ),
      officerId: officer.id,
      officerName: officer.name,
      createdById: ADMIN_ID,
      status,
    });

    setTickets((prev) => [savedTicket, ...prev]);

    setSelectedViolations([]);

    setForm((prev) => ({
      ...prev,
      studentId: "",
      violatorName: "",
      plate: "",
      violation: "",
      location: "",
      fine: "",
      make: "",
      model: "",
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

  async function reviewTicket(t: Ticket) {
    const currentTicket = tickets.find(
      (ticket) => ticket.id === t.id
    );

    if (
      !currentTicket ||
      currentTicket.status !== "issued" ||
      savingTicket
    ) {
      return;
    }

    setSavingTicket(true);
    setSaveError("");

    try {
      const updatedTicket = await updateTicket(currentTicket.id, {
        studentId: currentTicket.studentId ?? "",
        violatorName: currentTicket.violatorName ?? "",
        licensePlate: currentTicket.plate,
        state: currentTicket.state,
        vehicleMake: currentTicket.vehicleMake ?? "",
        vehicleModel: currentTicket.vehicleModel ?? "",
        vehicleColor: currentTicket.vehicleColor ?? "",
        violationType: currentTicket.violation,
        location: currentTicket.location,
        fineAmount: currentTicket.fine,
        notes: currentTicket.notes ?? "",
        officerId: currentTicket.officerId,
        officerName: currentTicket.officerName,
        status: "reviewed",
      });

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === currentTicket.id
            ? updatedTicket
            : ticket
        )
      );
    } catch (error) {
      console.error("Failed to review ticket:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to review ticket.";

      setSaveError(message);
      alert(message);
    } finally {
      setSavingTicket(false);
    }
  }

  async function submitToSells(t: Ticket) {
    const currentTicket = tickets.find((x) => x.id === t.id);

    if (!currentTicket || savingTicket) {
      return;
    }

    if (!canSubmitToSells(currentTicket)) {
      setSaveError(
        "Only reviewed tickets with an expired appeal period can be submitted."
      );
      return;
    }

    setSavingTicket(true);
    setSaveError("");

    try {
      const updatedTicket = await updateTicket(t.id, {
        studentId: currentTicket.studentId ?? "",
        violatorName: currentTicket.violatorName ?? "",
        licensePlate: currentTicket.plate,
        state: currentTicket.state,
        vehicleMake: currentTicket.vehicleMake ?? "",
        vehicleModel: currentTicket.vehicleModel ??"",
        vehicleColor: currentTicket.vehicleColor ?? "",
        violationType: currentTicket.violation,
        location: currentTicket.location,
        fineAmount: currentTicket.fine,
        notes: currentTicket.notes ?? "",
        officerId: currentTicket.officerId,
        officerName: currentTicket.officerName,
        status: "submitted",
      });

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === t.id ? updatedTicket : ticket
        )
      );

      setReviewing(null);
    } catch (error) {
      console.error("Failed to submit ticket:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to submit ticket."
      );
    } finally {
      setSavingTicket(false);
    }
  }

  async function flagTicket(t: Ticket, notes: string) {
    if (savingTicket || !notes.trim()) return;

    setSavingTicket(true);
    setSaveError("");

    console.log("Ticket being flagged:", t);
    console.log("Violation being sent:", t.violation);

    try {
      const updatedTicket = await updateTicket(t.id, {
        studentId: t.studentId ?? "",
        violatorName: t.violatorName ?? "",
        licensePlate: t.plate,
        state: t.state,
        vehicleMake: t.vehicleMake ?? "",
        vehicleModel: t.vehicleModel ?? "",
        vehicleColor: t.vehicleColor ?? "",
        violationType: t.violation,
        location: t.location,
        fineAmount: t.fine,
        notes: buildTicketNotes(
          readTicketNotes(t.notes ?? "", t.violation).selectedViolations,
          violationTypes,
          notes
        ),
        officerId: t.officerId,
        officerName: t.officerName,
        status: "flagged",
      });

      console.log("Requested status: flagged");
      console.log("Backend returned status:", updatedTicket.status);
      console.log("Updated ticket:", updatedTicket);

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === t.id ? updatedTicket : ticket
        )
      );

      setFlagging(null);
      setFlagNotes("");
    } catch (error) {
      console.error("Failed to flag ticket:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to flag ticket."
      );
    } finally {
      setSavingTicket(false);
    }
  }


  async function unflagTicket(t: Ticket) {
    if (savingTicket || t.status !== "flagged") return;

    setSavingTicket(true);
    setSaveError("");

    try {
      const updatedTicket = await updateTicket(t.id, {
        studentId: t.studentId ?? "",
        violatorName: t.violatorName ?? "",
        licensePlate: t.plate,
        state: t.state,
        vehicleMake: t.vehicleMake ?? "",
        vehicleModel: t.vehicleModel ?? "",
        vehicleColor: t.vehicleColor ?? "",
        violationType: t.violation,
        location: t.location,
        fineAmount: t.fine,
        notes: t.notes ?? "",
        officerId: t.officerId,
        officerName: t.officerName,
        status: "issued",
      });

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === t.id ? updatedTicket : ticket
        )
      );
    } catch (error) {
      console.error("Failed to unflag ticket:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to unflag ticket."
      );
    } finally {
      setSavingTicket(false);
    }
  }


function openEditTicket(ticket: Ticket) {
  if (!canEditTicket(ticket)) return;

  setSaveError("");

  const restored = readTicketNotes(
      ticket.notes ?? "",
      ticket.violation
    );

    setEditSelectedViolations(restored.selectedViolations);
    setEditOfficerNotes(restored.officerNotes);
    setEditing({ ...ticket });
  }


  async function saveChanges(
  t: Ticket,
  requestedStatus: TicketStatus = t.status
) {
  if (savingTicket) return;

  const currentTicket = tickets.find(
    (ticket) => ticket.id === t.id
  );

  if (!currentTicket || !canEditTicket(currentTicket)) {
    setSaveError("You do not have permission to edit this ticket.");
    return;
  }

  if (
    currentTicket.status === "draft" &&
    requestedStatus === "issued" &&
    !canIssueDraft(currentTicket)
  ) {
    setSaveError("Only the original creator can issue this draft.");
    return;
  }

  if (
    editSelectedViolations.length === 0 &&
    requestedStatus !== "draft"
  ) {
    setSaveError("Please select at least one violation.");
    return;
  }

    setSavingTicket(true);
    setSaveError("");

    try {
      const updatedTicket = await updateTicket(t.id, {
        studentId: t.studentId ?? "",
        violatorName: t.violatorName ?? "",
        licensePlate: t.plate,
        state: t.state,
        vehicleMake: t.vehicleMake ?? "",
        vehicleModel: t.vehicleModel ?? "",
        vehicleColor: t.vehicleColor ?? "",
        violationType: editSelectedViolations.join("; "),
        location: t.location,
        fineAmount: t.fine,
        notes: buildTicketNotes(
          editSelectedViolations,
          violationTypes,
          editOfficerNotes
        ),
        officerId: t.officerId,
        officerName: t.officerName,
        status: requestedStatus,
      });

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === t.id ? updatedTicket : ticket
        )
      );

      setEditing(null);
    } catch (error) {
      console.error("Failed to update ticket:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to update ticket."
      );
    } finally {
      setSavingTicket(false);
    }
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
      className="admin-layout"
      style={{
        gridTemplateColumns: sidebarOpen
          ? "220px minmax(0, 1fr)"
          : "48px minmax(0, 1fr)",
      }}
    >
      {/* Sidebar */}
      <aside className="admin-sidebar">
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
                [
                  "Reviewed",
                  activeTickets.filter((ticket) =>
                    ticket.status === "reviewed"
                  ).length,
                ],
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
              </button>
            ))}
          </nav>
        )}
      </aside>

      {/* Content */}
      <div className="admin-content">
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

        <div className="admin-page-content">
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
              <div className="admin-form-grid">
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

              <div className="admin-form-grid admin-plate-grid">
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
                    placeholder="e.g. CA"
                    maxLength={2}
                    style={{
                      ...inputStyle,
                      fontFamily: "var(--font-mono)",
                      textAlign: "center",
                    }}
                  />
                </Field>
              </div>
              <div className="admin-form-grid">
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
                      fine: selectedTypes.length > 0
                        ? String(total)
                        : "",
                    }));
                  }}
                />

                {violationTypesError && (
                  <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
                    {violationTypesError}
                  </p>
                )}
              </div>
              <div className="admin-form-grid admin-location-grid">
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
                <div className="admin-desktop-tickets">
                <TicketTable
                  tickets={filtered}
                  onSelect={openEditTicket}
                  actions={(t) => (
                    <div className="inline-grid w-max grid-flow-col auto-cols-max gap-1.5 whitespace-nowrap">
                      {canEditTicket(t) && (
                        <button
                          className="col-start-1 row-start-1"
                          onClick={() => openEditTicket(t)}
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
                      )} 
                      {canIssueDraft(t) && (
                        <button
                          type="button"
                          className="col-start-2 row-start-1 font-mono text-xs px-2 py-1 rounded cursor-pointer"
                          onClick={() => openEditTicket(t)}
                          disabled={savingTicket}
                          style={{
                            border: "1px solid var(--color-primary)",
                            background: "var(--color-primary-soft)",
                            color: "var(--color-primary)",
                          }}
                        >
                          Issue
                        </button>
                      )}                
                      {t.status !== "draft" && t.status !== "appealed" && (                        <button
                          type="button"
                          onClick={() =>
                            setTickets((prev) =>
                              prev.map((ticket) =>
                                ticket.id === t.id
                                  ? { ...ticket, status: "appealed" }
                                  : ticket
                              )
                            )
                          }
                          className="col-start-2 row-start-1 font-mono text-xs px-2 py-1 rounded cursor-pointer"
                          style={{
                            border: "1px solid var(--color-primary)",
                            background: "var(--color-primary-soft)",
                            color: "var(--color-primary)",
                          }}
                        >
                          Appeal
                        </button>
                      )}

                      {(t.status === "issued" ||
                        t.status === "reviewed") && (
                        <button
                          className="col-start-1 row-start-2"
                          onClick={() => {
                            setFlagging(t)
                            setFlagNotes(readTicketNotes(t.notes ?? "").officerNotes)
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
                      {t.status === "flagged" && (
                        <button
                          type="button"
                          className="col-start-1 row-start-2"
                          onClick={() => unflagTicket(t)}
                          disabled={savingTicket}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: "1px solid var(--color-status-submitted)",
                            background: "var(--color-status-submitted-soft)",
                            color: "var(--color-status-submitted)",
                            cursor: savingTicket ? "not-allowed" : "pointer",
                          }}
                        >
                          Unflag
                        </button>
                      )}
                      {t.status === "issued" && (
                        <button
                          type="button"
                          className="col-start-2 row-start-2"
                          onClick={() => reviewTicket(t)}
                          disabled={savingTicket}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: "1px solid var(--color-status-reviewed)",
                            background: "var(--color-status-reviewed-soft)",
                            color: "var(--color-status-reviewed)",
                            cursor: savingTicket ? "not-allowed" : "pointer",
                          }}
                        >
                          Review
                        </button>
                      )}
                      {t.status === "reviewed" && (
                      <>
                        <button
                          type="button"
                          className="col-start-2 row-start-2"
                          onClick={() => {
                            setSaveError("");
                            setReviewing(t);
                          }}
                          disabled={savingTicket || !canSubmitToSells(t, now)}
                          title={getAppealTimeRemaining(t, now)}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: "1px solid var(--color-status-submitted)",
                            background: "var(--color-status-submitted-soft)",
                            color: "var(--color-status-submitted)",
                            opacity: canSubmitToSells(t, now) ? 1 : 0.5,
                            cursor:
                              savingTicket || !canSubmitToSells(t, now)
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Submit
                        </button>

                        <span
                          className="col-span-2 row-start-3"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            color: "var(--color-ink-mid)",
                            textAlign: "center",
                          }}
                        >
                          {getAppealTimeRemaining(t, now)}
                        </span>
                      </>
                    )}
                    </div>
                  )}
                />
                </div>
                <div className="admin-mobile-tickets">
                  {filtered.length === 0 ? (
                    <p>No tickets found.</p>
                  ) : (
                    filtered.map((ticket) => (
                      <details key={ticket.id}>
                        <summary>
                          Ticket #{ticket.id} — {ticket.plate}
                        </summary>

                        <div className="admin-mobile-ticket-details">
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

                          <div className="admin-mobile-ticket-actions">
                            {canEditTicket(ticket) && (
                              <button
                                type="button"
                                onClick={() => openEditTicket(ticket)}
                              >
                                Edit
                              </button>
                            )}

                            {canIssueDraft(ticket) && (
                              <button
                                type="button"
                                onClick={() => openEditTicket(ticket)}
                                disabled={savingTicket}
                                style={{
                                  border: "1px solid var(--color-primary)",
                                  background: "var(--color-primary-soft)",
                                  color: "var(--color-primary)",
                                }}
                              >
                                Issue
                              </button>
                            )}

                            {ticket.status !== "draft" && ticket.status !== "appealed" && (
                              <button
                                className="col-start-2 row-start-1 font-mono text-xs px-2 py-1 rounded cursor-pointer"
                                type="button"
                                style={{
                                  border: "1px solid var(--color-primary)",
                                  background: "var(--color-primary-soft)",
                                  color: "var(--color-primary)",
                                }}
                                onClick={() =>
                                  setTickets((prev) =>
                                    prev.map((t) =>
                                      t.id === ticket.id
                                        ? { ...t, status: "appealed" }
                                        : t
                                    )
                                  )
                                }
                              >
                                Appeal
                              </button>
                            )}

                            {(ticket.status === "issued" ||
                              ticket.status === "reviewed") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFlagging(ticket);
                                    setFlagNotes(readTicketNotes(ticket.notes ?? "").officerNotes)
                                  }}
                                >
                                  Flag
                                </button>
                              )}

                            {ticket.status === "flagged" && (
                              <button
                                type="button"
                                disabled={savingTicket}
                                onClick={() => unflagTicket(ticket)}
                              >
                                Unflag
                              </button>
                            )}

                            {ticket.status === "issued" && (
                              <button
                                type="button"
                                onClick={() => reviewTicket(ticket)}
                                disabled={savingTicket}
                                style={{
                                  border: "1px solid var(--color-status-reviewed)",
                                  background: "var(--color-status-reviewed-soft)",
                                  color: "var(--color-status-reviewed)",
                                  cursor: savingTicket ? "not-allowed" : "pointer",
                                }}
                              >
                                Review
                              </button>
                            )}
                            {ticket.status === "reviewed" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSaveError("");
                                  setReviewing(ticket);
                                }}
                                disabled={
                                  savingTicket || !canSubmitToSells(ticket, now)
                                }
                                style={{
                                  border: "1px solid var(--color-status-submitted)",
                                  background: "var(--color-status-submitted-soft)",
                                  color: "var(--color-status-submitted)",
                                  opacity: canSubmitToSells(ticket, now) ? 1 : 0.5,
                                  cursor:
                                    savingTicket || !canSubmitToSells(ticket, now)
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                Submit to Sells
                              </button>

                              <div
                                style={{
                                  width: "100%",
                                  fontSize: 11,
                                  fontFamily: "var(--font-mono)",
                                  color: "var(--color-ink-mid)",
                                }}
                              >
                                {getAppealTimeRemaining(ticket, now)}
                              </div>
                            </>
                          )}
                          </div>
                        </div>
                      </details>
                    ))
                  )}
                </div>

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
          <div className="admin-edit-grid">
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
            <Field label="VEHICLE MAKE">
              <input
                value={editing.vehicleMake ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, vehicleMake: e.target.value })
                }
                placeholder="e.g. Toyota"
                style={inputStyle}
              />
            </Field>

            <Field label="VEHICLE MODEL">
              <input
                value={editing.vehicleModel ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, vehicleModel: e.target.value })
                }
                placeholder="e.g. Camry"
                style={inputStyle}
              />
            </Field>

            <Field label="VEHICLE COLOR">
              <input
                value={editing.vehicleColor ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, vehicleColor: e.target.value })
                }
                placeholder="e.g. Silver"
                style={inputStyle}
              />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <MultiViolationSelector
                violationTypes={violationTypes}
                selectedViolations={editSelectedViolations}
                onChange={(violations) => {
                  setEditSelectedViolations(violations);

                  const selectedTypes = violationTypes.filter((type) =>
                    violations.includes(type.name)
                  );

                  const total = selectedTypes.reduce(
                    (sum, type) => sum + type.defaultFine,
                    0
                  );

                  setEditing((prev) =>
                    prev
                      ? {
                          ...prev,
                          violation: selectedTypes[0]?.name ?? "",
                          fine: total,
                        }
                      : null
                  );
                }}
              />
            </div>

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
              <input
                value={
                  editing.status === "issued"
                    ? "Pending Review"
                    : editing.status.charAt(0).toUpperCase() +
                      editing.status.slice(1)
                }
                readOnly
                style={{
                  ...inputStyle,
                  background: "#f3f4f6",
                  cursor: "default",
                }}
              />
            </Field>
          </div>
          <Field label="NOTES">
            <textarea
              value={editOfficerNotes}
              onChange={(e) => setEditOfficerNotes(e.target.value)}
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
              onClick={() => saveChanges(editing)}
              disabled={savingTicket} 
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
              {savingTicket
                ? "Saving..."
                : editing.status === "draft"
                  ? "Save Draft"
                  : "Save Changes"
                }              
                {saveError && (
                <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
                  {saveError}
                </p>
              )}
            </button>
            {canIssueDraft(editing) && (
              <button
                type="button"
                onClick={() => saveChanges(editing, "issued")}
                disabled={savingTicket}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 13,
                  padding: "9px 20px",
                  borderRadius: 5,
                  border: "none",
                  background: "var(--color-primary)",
                  color: "#fff",
                  cursor: savingTicket ? "not-allowed" : "pointer",
                }}
              >
                {savingTicket ? "Issuing..." : "Issue Ticket"}
              </button>
            )}
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
            The 10-day appeal period has expired.
            Please verify the ticket information below before continuing.
            Confirming will move this ticket from Reviewed to the
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
              disabled={
                savingTicket ||
                !tickets.some(
                  (ticket) =>
                    ticket.id === reviewing.id &&
                    canSubmitToSells(ticket, now)
                )
              }
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
              {savingTicket ? "Submitting..." : "Confirm — Submit to Sells"}
              {saveError && (
                <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
                  {saveError}
                </p>
              )}
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
              disabled={!flagNotes.trim() || savingTicket}
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
              {savingTicket ? "Saving..." : "Flag Ticket"}
              {saveError && (
                <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
                  {saveError}
                </p>
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
