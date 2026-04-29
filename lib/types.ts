// ─── Card color ─────────────────────────────────────────────────────────────

export type CardColor = "pink" | "teal" | "green" | "orange" | "neutral";

export const CARD_COLORS: readonly CardColor[] = [
  "pink",
  "teal",
  "green",
  "orange",
  "neutral",
] as const;

export function isCardColor(value: unknown): value is CardColor {
  return (
    typeof value === "string" &&
    (CARD_COLORS as readonly string[]).includes(value)
  );
}

// ─── Database row (full, including private fields) ───────────────────────────

export type VisitorRecord = {
  id: string;
  number: number;
  name: string;
  color: CardColor;
  signature: string | null;
  feedback: string | null; // PRIVATE — never send to public
  approved: boolean;
  issued_at: string;
  created_at: string;
};

// ─── Public shape returned by the API ───────────────────────────────────────

export type PublicVisitor = {
  id: string;
  number: number;
  name: string;
  color: CardColor;
  signature: string | null;
  issued_at: string;
};

/** Strip private fields. Call this before any public API response. */
export function toPublic(r: VisitorRecord): PublicVisitor {
  return {
    id: r.id,
    number: r.number,
    name: r.name,
    color: r.color,
    signature: r.signature,
    issued_at: r.issued_at,
  };
}

// ─── Validation constants ────────────────────────────────────────────────────

export const FEEDBACK_MAX_WORDS = 200;
export const FEEDBACK_MAX_CHARS = 2000;
export const NAME_MAX_LENGTH = 60;
export const SIGNATURE_MAX_BYTES = 60_000;

// ─── Palette metadata (used in the UI) ──────────────────────────────────────

export const PALETTE: {
  value: CardColor;
  label: string;
  bg: string;
  fg: string;
  sigColor: string;      // ink colour to draw with on this card
  dividerColor: string;  // baseline under signature
}[] = [
  {
    value: "pink",
    label: "Rose",
    bg: "#b56060",
    fg: "#ffffff",
    sigColor: "#ffffff",
    dividerColor: "rgba(255,255,255,0.35)",
  },
  {
    value: "teal",
    label: "Ink",
    bg: "#357070",
    fg: "#ffffff",
    sigColor: "#ffffff",
    dividerColor: "rgba(255,255,255,0.35)",
  },
  {
    value: "green",
    label: "Sage",
    bg: "#476e55",
    fg: "#ffffff",
    sigColor: "#ffffff",
    dividerColor: "rgba(255,255,255,0.35)",
  },
  {
    value: "orange",
    label: "Amber",
    bg: "#a86030",
    fg: "#ffffff",
    sigColor: "#ffffff",
    dividerColor: "rgba(255,255,255,0.35)",
  },
  {
    value: "neutral",
    label: "Ivory",
    bg: "#ccc4b4",
    fg: "#1e1a16",
    sigColor: "#1e1a16",
    dividerColor: "rgba(0,0,0,0.22)",
  },
];

export function paletteFor(color: CardColor) {
  return PALETTE.find((p) => p.value === color) ?? PALETTE[0];
}
