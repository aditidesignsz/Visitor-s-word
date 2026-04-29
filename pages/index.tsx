import Head from "next/head";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { generateVisitorName } from "../lib/visitor-name";
import { countWords, FEEDBACK_MAX_WORDS } from "../lib/validation";
import { PALETTE, paletteFor } from "../lib/types";
import type { CardColor, PublicVisitor } from "../lib/types";

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({
  strokeColor,
  onInkChange,
  canvasRef,
}: {
  strokeColor: string;
  onInkChange: (has: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const inkPresent = useRef(false);
  const prevStroke = useRef(strokeColor);

  // Size canvas to match its CSS size, preserving DPR sharpness
  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    let snap: ImageData | null = null;
    if (inkPresent.current && canvas.width > 0 && canvas.height > 0) {
      try { snap = ctx.current?.getImageData(0, 0, canvas.width, canvas.height) ?? null; } catch {}
    }
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const c = canvas.getContext("2d")!;
    ctx.current = c;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineCap = "round";
    c.lineJoin = "round";
    if (snap) c.putImageData(snap, 0, 0);
  }, [canvasRef]);

  useEffect(() => {
    syncSize();
    const ro = new ResizeObserver(syncSize);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [syncSize, canvasRef]);

  // Re-tint existing strokes when card colour changes
  useEffect(() => {
    if (prevStroke.current === strokeColor) return;
    prevStroke.current = strokeColor;
    const canvas = canvasRef.current;
    const c = ctx.current;
    if (!canvas || !c || !inkPresent.current) return;
    const hex = strokeColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const img = c.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] > 0) {
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
      }
    }
    c.putImageData(img, 0, 0);
  }, [strokeColor, canvasRef]);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current || !last.current || !ctx.current) return;
    const p = pos(e);
    const c = ctx.current;
    c.strokeStyle = strokeColor;
    c.lineWidth   = 2;
    c.globalCompositeOperation = "source-over";
    c.beginPath();
    c.moveTo(last.current.x, last.current.y);
    c.lineTo(p.x, p.y);
    c.stroke();
    last.current = p;
    if (!inkPresent.current) { inkPresent.current = true; onInkChange(true); }
  }

  function onUp(e: React.PointerEvent) {
    drawing.current = false;
    last.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch {}
  }

  function clear() {
    const canvas = canvasRef.current;
    const c = ctx.current;
    if (!canvas || !c) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    inkPresent.current = false;
    onInkChange(false);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "crosshair" }}
      />
      <button
        type="button"
        onClick={clear}
        style={{
          position: "absolute", top: 6, right: 6,
          fontFamily: "'Courier Prime', monospace",
          fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
          padding: "3px 8px", borderRadius: 4,
          background: "rgba(255,255,255,0.2)", color: "inherit",
          border: "none", cursor: "pointer",
        }}
      >
        clear
      </button>
    </div>
  );
}

// ─── Visitor Card ─────────────────────────────────────────────────────────────

type CardProps = {
  name: string;
  color: CardColor;
  number: number;
  issuedAt: string;
  // Editable mode: live signature pad
  editable?: true;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  onInkChange?: (has: boolean) => void;
  // Static mode: show a saved signature image
  signatureImg?: string | null;
};

function VisitorCard(props: CardProps) {
  const { name, color, number, issuedAt, editable, canvasRef, onInkChange, signatureImg } = props;
  const pal = paletteFor(color);

  const d = new Date(issuedAt);
  const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;

  return (
    <div
      style={{
        width: 340, minHeight: 212,
        borderRadius: 18,
        background: pal.bg, color: pal.fg,
        padding: "22px 26px",
        display: "flex", flexDirection: "column",
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        position: "relative", overflow: "hidden", flexShrink: 0,
        boxShadow: "0 12px 44px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)",
        transition: "background 0.4s ease",
        userSelect: "none",
      }}
    >
      {/* Badge */}
      <div style={{
        position: "absolute", top: 14, right: 18,
        fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase",
        opacity: 0.45,
      }}>
        visitor
      </div>

      {/* Name */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.55, marginBottom: 5 }}>
          Name
        </div>
        <div style={{ fontSize: 18, letterSpacing: "0.01em", lineHeight: 1 }}>
          {name || "—"}
        </div>
      </div>

      {/* Issued date */}
      <div>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>
          Issued
        </div>
        <div style={{ fontSize: 13 }}>{dateStr}</div>
      </div>

      {/* Signature row */}
      <div style={{
        marginTop: "auto", paddingTop: 14,
        display: "flex", alignItems: "flex-end", gap: 10,
      }}>
        <div style={{ fontSize: 22, opacity: 0.5, lineHeight: 1, paddingBottom: 4 }}>×</div>
        <div style={{
          flex: 1, height: 52, position: "relative",
          borderBottom: `1px solid ${pal.dividerColor}`,
          overflow: "hidden",
        }}>
          {editable && canvasRef && onInkChange ? (
            <SignaturePad
              strokeColor={pal.sigColor}
              onInkChange={onInkChange}
              canvasRef={canvasRef}
            />
          ) : signatureImg ? (
            <img
              src={signatureImg}
              alt="signature"
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "contain", pointerEvents: "none",
                // For coloured cards, signature was drawn in white; invert for neutral
                filter: color !== "neutral" ? "none" : "invert(1)",
              }}
            />
          ) : null}
        </div>
        <div style={{
          fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
          opacity: 0.5, whiteSpace: "nowrap", paddingBottom: 4,
        }}>
          No.&nbsp;{String(number).padStart(3, "0")}
        </div>
      </div>
    </div>
  );
}

// ─── Mini gallery card ────────────────────────────────────────────────────────

function MiniCard({ visitor }: { visitor: PublicVisitor }) {
  return (
    <div style={{ transform: "scale(0.68)", transformOrigin: "top left", marginRight: -110, marginBottom: -72 }}>
      <VisitorCard
        name={visitor.name}
        color={visitor.color}
        number={visitor.number}
        issuedAt={visitor.issued_at}
        signatureImg={visitor.signature}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageState = "idle" | "submitting" | "done";

export default function Home() {
  const [name, setName]         = useState("");
  const [color, setColor]       = useState<CardColor>("pink");
  const [feedback, setFeedback] = useState("");
  const [hasInk, setHasInk]     = useState(false);
  const [state, setState]       = useState<PageState>("idle");
  const [error, setError]       = useState("");
  const [card, setCard]         = useState<PublicVisitor | null>(null);
  const [gallery, setGallery]   = useState<PublicVisitor[]>([]);
  const [nextNum, setNextNum]   = useState(1);
  const canvasRef               = useRef<HTMLCanvasElement>(null);

  const words    = feedback.trim() ? countWords(feedback) : 0;
  const overLimit = words > FEEDBACK_MAX_WORDS;

  // On mount: seed name, check for existing card, load gallery
  useEffect(() => {
    setName(generateVisitorName());

    fetch("/api/visit", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<PublicVisitor>) : null))
      .then((v) => { if (v) { setCard(v); setState("done"); } })
      .catch(() => {});

    fetch("/api/visitors?limit=12")
      .then((r) => (r.ok ? r.json() : { visitors: [], total: 0 }))
      .then((d: { visitors: PublicVisitor[]; total: number }) => {
        setGallery(d.visitors);
        setNextNum((d.total ?? d.visitors.length) + 1);
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter a name."); return; }
    if (overLimit) { setError(`Feedback must be ${FEEDBACK_MAX_WORDS} words or fewer.`); return; }
    setError("");
    setState("submitting");

    let signature: string | null = null;
    const canvas = canvasRef.current;
    if (hasInk && canvas && canvas.width && canvas.height) {
      try { signature = canvas.toDataURL("image/png"); } catch {}
    }

    try {
      const res = await fetch("/api/visit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), color, signature,
          feedback: feedback.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Error ${res.status}`);
      const v: PublicVisitor = await res.json();
      setCard(v);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  }

  function reset() {
    fetch("/api/visit", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
    setCard(null); setName(generateVisitorName()); setColor("pink");
    setFeedback(""); setHasInk(false); setError(""); setState("idle");
  }

  return (
    <>
      <Head>
        <title>Visitor Book</title>
        <meta name="description" content="Leave your mark — sign the visitor book." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main>
        {/* Grain overlay */}
        <div className="grain" aria-hidden="true" />

        <div className="container">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <header className="header">
            <p className="eyebrow">✦ &thinsp; Leave your mark &thinsp; ✦</p>
            <h1 className="title">Visitor Book</h1>
            <div className="rule" />
          </header>

          {/* ── DONE ───────────────────────────────────────────────────── */}
          {state === "done" && card && (
            <section className="done-section">
              <p className="done-headline">You&rsquo;ve signed the book.</p>
              <p className="done-sub">Your card will appear in the gallery after review.</p>
              <div className="card-scroll">
                <VisitorCard
                  name={card.name} color={card.color}
                  number={card.number} issuedAt={card.issued_at}
                  signatureImg={card.signature}
                />
              </div>
              <button className="link-btn" onClick={reset}>Sign again</button>
            </section>
          )}

          {/* ── FORM ───────────────────────────────────────────────────── */}
          {(state === "idle" || state === "submitting") && (
            <form onSubmit={submit} noValidate className="form">

              {/* Name */}
              <div className="field">
                <label className="field-label" htmlFor="name-input">Your name</label>
                <div className="name-row">
                  <input
                    id="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="flower dreamer"
                    className="text-input"
                  />
                  <button
                    type="button"
                    className="shuffle-btn"
                    onClick={() => setName(generateVisitorName())}
                    aria-label="Generate a new random name"
                    title="Shuffle name"
                  >
                    ↻
                  </button>
                </div>
              </div>

              {/* Color picker */}
              <div className="field">
                <span className="field-label">Card colour</span>
                <div className="color-row" role="group" aria-label="Card colour">
                  {PALETTE.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className={`swatch${color === p.value ? " swatch--active" : ""}`}
                      style={{ background: p.bg }}
                      onClick={() => setColor(p.value)}
                      aria-pressed={color === p.value}
                      aria-label={p.label}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>

              {/* Signature */}
              <div className="field">
                <span className="field-label">Sign your card</span>
                <p className="hint">Draw your signature in the card below</p>
                <div className="card-scroll">
                  <VisitorCard
                    name={name || "your name"}
                    color={color}
                    number={nextNum}
                    issuedAt={new Date().toISOString()}
                    editable
                    canvasRef={canvasRef}
                    onInkChange={setHasInk}
                  />
                </div>
              </div>

              {/* Feedback */}
              <div className="field">
                <label className="field-label" htmlFor="feedback-input">
                  Leave a note{" "}
                  <span className="field-label-muted">— optional, private</span>
                </label>
                <p className="hint">Only visible to the site owner</p>
                <textarea
                  id="feedback-input"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Hello from the internet…"
                  className={`text-input textarea${overLimit ? " textarea--error" : ""}`}
                />
                <div className={`word-count${overLimit ? " word-count--over" : ""}`}>
                  {words} / {FEEDBACK_MAX_WORDS} words
                </div>
              </div>

              {error && <p className="error-msg">{error}</p>}

              <div className="submit-row">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={state === "submitting" || overLimit}
                >
                  {state === "submitting" ? "Signing…" : "Sign the book →"}
                </button>
              </div>

            </form>
          )}

          {/* ── Gallery ────────────────────────────────────────────────── */}
          {gallery.length > 0 && (
            <section className="gallery">
              <p className="gallery-label">── Recent visitors ──</p>
              <div className="gallery-grid">
                {gallery.map((v) => <MiniCard key={v.id} visitor={v} />)}
              </div>
            </section>
          )}

          <footer className="footer">✦ &thinsp; Thank you for visiting &thinsp; ✦</footer>

        </div>
      </main>
    </>
  );
}
