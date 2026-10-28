interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = "Search by license plate…" }: Props) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <svg
        style={{ position: "absolute", left: 10, color: "var(--color-ink-muted)", pointerEvents: "none" }}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          padding: "7px 12px 7px 30px",
          borderRadius: 5,
          border: "1px solid var(--color-rule)",
          background: "#fff",
          color: "var(--color-ink)",
          outline: "none",
          width: 240,
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--color-rule)")}
      />
    </div>
  );
}
