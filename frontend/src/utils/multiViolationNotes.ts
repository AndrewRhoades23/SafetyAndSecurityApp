
type ViolationType = {
  id: number;
  name: string;
  defaultFine: number;
};

const START = "[MULTI_VIOLATIONS]";
const END = "[/MULTI_VIOLATIONS]";

export function buildTicketNotes(
  selectedViolations: string[],
  violationTypes: ViolationType[],
  officerNotes: string
): string {
  if (selectedViolations.length === 0) {
    return officerNotes.trim();
  }

  const lines = selectedViolations.map((name) => {
    const type = violationTypes.find((v) => v.name === name);
    const fine = type?.defaultFine ?? 0;

    return `- ${name}: $${fine.toFixed(2)}`;
  });

  const breakdown = [
    START,
    ...lines,
    END,
  ].join("\n");

  return [breakdown, officerNotes.trim()]
    .filter(Boolean)
    .join("\n\n");
}

export function readTicketNotes(
  notes: string,
  fallbackViolation = ""
): {
  selectedViolations: string[];
  officerNotes: string;
} {
  const start = notes.indexOf(START);
  const end = notes.indexOf(END, start + START.length);

  if (start === -1 || end === -1) {
    return {
      selectedViolations: fallbackViolation
        ? [fallbackViolation]
        : [],
      officerNotes: notes,
    };
  }

  const block = notes.slice(start + START.length, end);

  const selectedViolations = block
    .split("\n")
    .map((line) =>
      line.trim().match(/^- (.+): \$\d+(?:\.\d+)?$/)?.[1]
    )
    .filter((name): name is string => Boolean(name));

  const officerNotes = (
    notes.slice(0, start) +
    notes.slice(end + END.length)
  ).trim();

  return {
    selectedViolations,
    officerNotes,
  };
}
