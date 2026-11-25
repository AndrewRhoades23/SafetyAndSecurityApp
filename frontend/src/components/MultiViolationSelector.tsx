import { useState } from "react";

type ViolationType = {
  id: number;
  name: string;
  defaultFine: number;
};

type Props = {
  violationTypes: ViolationType[];
  selectedViolations: string[];
  onChange: (violations: string[]) => void;
};

export default function MultiViolationSelector({
  violationTypes,
  selectedViolations,
  onChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const total = violationTypes
    .filter((type) => selectedViolations.includes(type.name))
    .reduce((sum, type) => sum + type.defaultFine, 0);

  function toggleViolation(name: string) {
    if (selectedViolations.includes(name)) {
      onChange(selectedViolations.filter((item) => item !== name));
    } else {
      onChange([...selectedViolations, name]);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-rule)",
        borderRadius: 6,
        padding: 14,
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 12,
          color: "var(--color-ink)",
        }}
      >
        SELECT VIOLATIONS *
      </div>
      
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        disabled={violationTypes.length === 0}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid var(--color-rule)",
          borderRadius: 6,
          background: "#fff",
          color: "var(--color-ink)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
        }}
      >
        <span>
          {selectedViolations.length > 0
            ? `${selectedViolations.length} violation(s) selected`
            : "Select violations"}
        </span>

        <span>{isOpen ? "▴" : "▾"}</span>
      </button>

      {violationTypes.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--color-ink-mid)" }}>
          No violation types available.
        </p>
      )}

      {isOpen && violationTypes.map((type) => (
        <label
          key={type.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "9px 0",
            borderBottom: "1px solid var(--color-rule)",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "var(--color-ink)",
            }}
          >
            <input
              type="checkbox"
              checked={selectedViolations.includes(type.name)}
              onChange={() => toggleViolation(type.name)}
            />
            {type.name}
          </span>

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              whiteSpace: "nowrap",
              color: "var(--color-ink)",
            }}
          >
            ${type.defaultFine.toFixed(2)}
          </span>
        </label>
      ))}

      {isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 8,
            border: "1px solid var(--color-rule)",
            borderRadius: 6,
            background: "#fff",
            color: "var(--color-ink)",
            cursor: "pointer",
          }}
        >
          Done
        </button>
      )}

      {selectedViolations.length > 0 && (
        <div
          style={{
            fontSize: 12,
            marginTop: 10,
            color: "var(--color-ink-mid)",
          }}
        >
          {selectedViolations.join(", ")}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
          paddingTop: 8,
        }}
      >
        <div>
          <strong style={{ fontSize: 14 }}>
            Total Fine
          </strong>

          <div
            style={{
              fontSize: 11,
              color: "var(--color-ink-mid)",
              marginTop: 4,
            }}
          >
            {selectedViolations.length} violation(s) selected
          </div>
        </div>

        <strong
          style={{
            fontSize: 22,
            color: "var(--color-primary)",
          }}
        >
          ${total.toFixed(2)}
        </strong>
      </div>
    </div>
  );
}
