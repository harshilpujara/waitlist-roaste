import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "input" | "loading" | "output";

interface Callout { verdict: string; explanation: string }
interface RewriteFields {
  headline: string; subheadline: string;
  body: string; cta: string; decision: string;
}
interface ParsedOutput {
  title: string; summary: string;
  praise: Callout[]; problems: Callout[];
  rewrite: RewriteFields;
}
interface HistoryEntry {
  id: number; inputSnippet: string;
  parsed: ParsedOutput; score: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LOADING_PHRASES = [
  "Scanning for corporate jargon...",
  "Finding the empty promises...",
  "A seed investor is not impressed...",
];

const S = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
};

const TERRA = "rgba(180,80,60,0.9)";
const GREEN = "rgba(60,140,90,0.9)";

// ── Parsers ───────────────────────────────────────────────────────────────────

function extractSection(raw: string, label: string, nextLabels: string[]): string {
  const re = new RegExp(`^${label}:?\\s*$`, "im");
  const m = re.exec(raw);
  if (!m) {
    // try inline: "LABEL: content..."
    const inlineRe = new RegExp(`^${label}:\\s*(.+)`, "im");
    const im = inlineRe.exec(raw);
    if (!im) return "";
    const start = im.index + im[0].length;
    let end = raw.length;
    for (const next of nextLabels) {
      const nr = new RegExp(`^${next}:`, "im").exec(raw.slice(start));
      if (nr) end = Math.min(end, start + nr.index);
    }
    return (im[1] + raw.slice(start, end)).trim();
  }
  const start = m.index + m[0].length;
  let end = raw.length;
  for (const next of nextLabels) {
    const nr = new RegExp(`^${next}:?`, "im").exec(raw.slice(start));
    if (nr) end = Math.min(end, start + nr.index);
  }
  return raw.slice(start, end).trim();
}

function parseDoubleSlash(text: string): Callout[] {
  return text.split("\n")
    .map(l => l.trim().replace(/^\d+\.\s*/, ""))
    .filter(l => l.includes("//"))
    .map(l => {
      const idx = l.indexOf("//");
      return { verdict: l.slice(0, idx).trim(), explanation: l.slice(idx + 2).trim() };
    });
}

function parseRewriteFields(text: string): RewriteFields {
  const get = (k: string) => {
    const m = text.match(new RegExp(`^${k}:?\\s*(.+)$`, "im"));
    return m ? m[1].trim() : "";
  };
  return {
    headline: get("Headline"),
    subheadline: get("Subheadline"),
    body: get("Body"),
    cta: get("CTA"),
    decision: get("Decision"),
  };
}

function parseOutput(raw: string): ParsedOutput {
  const ALL = ["TITLE", "SUMMARY", "PRAISE", "PROBLEMS", "REWRITE"];
  const title = extractSection(raw, "TITLE", ALL.slice(1));
  const summary = extractSection(raw, "SUMMARY", ALL.slice(2));
  const praiseRaw = extractSection(raw, "PRAISE", ALL.slice(3));
  const problemsRaw = extractSection(raw, "PROBLEMS", ALL.slice(4));
  const rewriteRaw = extractSection(raw, "REWRITE", []);

  const praiseItems = parseDoubleSlash(praiseRaw).filter(
    p => !/^none$/i.test(p.verdict.trim())
  );
  const problems = parseDoubleSlash(problemsRaw);
  const rewrite = parseRewriteFields(rewriteRaw);

  return { title, summary, praise: praiseItems, problems, rewrite };
}

function calcScore(parsed: ParsedOutput): number {
  const score = 100 - parsed.problems.length * 12 + parsed.praise.length * 8;
  return Math.min(95, Math.max(5, score));
}

function scoreVerdict(score: number): string {
  if (score <= 30) return "Painful";
  if (score <= 55) return "Needs work";
  if (score <= 75) return "Getting there";
  return "Sharp";
}

// ── Copy hook ─────────────────────────────────────────────────────────────────

function useCopy() {
  const [key, setKey] = useState<string | null>(null);
  const copy = useCallback(async (text: string, k: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = Object.assign(document.createElement("textarea"), { value: text });
      document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setKey(k);
    setTimeout(() => setKey(null), 1500);
  }, []);
  return { copy, copiedKey: key };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyIcon({ text, ck, copiedKey, onCopy }: {
  text: string; ck: string; copiedKey: string | null;
  onCopy: (t: string, k: string) => void;
}) {
  const done = copiedKey === ck;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCopy(text, ck); }}
      title="Copy"
      style={{
        background: "none", border: "none", cursor: "pointer", padding: "2px",
        color: done ? GREEN : "rgba(0,0,0,0.25)",
        opacity: done ? 1 : 0, transition: "opacity 0.15s, color 0.15s",
        display: "flex", alignItems: "center", flexShrink: 0,
      }}
      className="copy-icon"
    >
      {done
        ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 9.5V2.5a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      }
    </button>
  );
}

function CopyPill({ text, ck, copiedKey, onCopy, label = "Copy all" }: {
  text: string; ck: string; copiedKey: string | null;
  onCopy: (t: string, k: string) => void; label?: string;
}) {
  const done = copiedKey === ck;
  return (
    <button
      onClick={() => onCopy(text, ck)}
      style={{
        background: done ? "rgba(60,140,90,0.1)" : "rgba(0,0,0,0.08)",
        border: `1px solid ${done ? "rgba(60,140,90,0.3)" : "rgba(0,0,0,0.12)"}`,
        borderRadius: "999px", padding: "4px 14px", fontSize: "12px",
        color: done ? GREEN : "rgba(0,0,0,0.6)",
        cursor: "pointer", transition: "all 0.2s ease",
        fontFamily: S.sans, fontWeight: 500,
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

function GlassCard({ children, style, className, hoverBright = true }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hoverBright?: boolean;
}) {
  return (
    <div
      className={`${hoverBright ? "glass-card" : ""} ${className ?? ""}`}
      style={{
        background: "rgba(255,255,255,0.18)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: "16px",
        padding: "16px 20px",
        transition: "all 0.15s ease-out",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [copyText, setCopyText] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);
  const [scrollPct, setScrollPct] = useState(0);
  const [resultsVisible, setResultsVisible] = useState(false);

  const rawRef = useRef("");
  const currentCopyRef = useRef("");
  const idRef = useRef(0);
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { copy, copiedKey } = useCopy();

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollPct(isNaN(pct) ? 0 : pct);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Phrase cycling
  useEffect(() => {
    if (phase === "loading") {
      phraseTimer.current = setInterval(() => setPhraseIdx(i => (i + 1) % LOADING_PHRASES.length), 2000);
    } else {
      if (phraseTimer.current) clearInterval(phraseTimer.current);
    }
    return () => { if (phraseTimer.current) clearInterval(phraseTimer.current); };
  }, [phase]);

  const handleRoast = useCallback(async () => {
    if (!copyText.trim()) return;
    currentCopyRef.current = copyText.trim();
    rawRef.current = "";
    setRawOutput(""); setError(""); setViewingEntry(null);
    setStreaming(true); setPhraseIdx(0);
    setPhase("loading"); setResultsVisible(false);
    document.title = "Waitlist Roaster";

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy: copyText }),
      });
      if (!res.ok || !res.body) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let outputStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const p = JSON.parse(raw);
            if (p.done) {
              setStreaming(false);
              const parsed = parseOutput(rawRef.current);
              const score = calcScore(parsed);
              if (parsed.title) document.title = parsed.title;
              idRef.current += 1;
              setHistory(prev => [{
                id: idRef.current,
                inputSnippet: currentCopyRef.current.slice(0, 70),
                parsed, score,
              }, ...prev]);
              setTimeout(() => setResultsVisible(true), 50);
              return;
            }
            if (p.error) {
              setError(p.error); setStreaming(false); setPhase("input"); return;
            }
            if (p.content) {
              rawRef.current += p.content;
              setRawOutput(rawRef.current);
              if (!outputStarted) { outputStarted = true; setPhase("output"); }
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setError("Connection failed. Please try again.");
      setPhase("input");
    } finally {
      setStreaming(false);
    }
  }, [copyText]);

  function handleReset() {
    setPhase("input"); setCopyText(""); setRawOutput(""); setError("");
    setStreaming(false); setViewingEntry(null); rawRef.current = "";
    setResultsVisible(false);
    document.title = "Waitlist Roaster";
  }

  function handleViewHistory(entry: HistoryEntry) {
    setViewingEntry(entry);
    setRawOutput(""); setStreaming(false);
    setPhase("output");
    setTimeout(() => setResultsVisible(true), 50);
    if (entry.parsed.title) document.title = entry.parsed.title;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Determine active parsed data
  let parsed: ParsedOutput;
  let score = 0;

  if (viewingEntry) {
    parsed = viewingEntry.parsed;
    score = viewingEntry.score;
  } else {
    parsed = parseOutput(rawOutput);
    score = calcScore(parsed);
  }

  const rewriteAll = [
    parsed.rewrite.headline && `Headline: ${parsed.rewrite.headline}`,
    parsed.rewrite.subheadline && `Subheadline: ${parsed.rewrite.subheadline}`,
    parsed.rewrite.body && `Body: ${parsed.rewrite.body}`,
    parsed.rewrite.cta && `CTA: ${parsed.rewrite.cta}`,
    parsed.rewrite.decision && `Decision: ${parsed.rewrite.decision}`,
  ].filter(Boolean).join("\n");

  const charCount = copyText.length;

  return (
    <>
      {/* Scroll progress bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, zIndex: 1000,
        height: "2px", width: `${scrollPct}%`,
        background: `linear-gradient(to right, ${TERRA}, ${GREEN})`,
        transition: "width 0.1s linear",
        pointerEvents: "none",
      }} />

      {/* Fixed background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -2,
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }} />
      {/* Frosted overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        background: "rgba(255,255,255,0.18)",
        backdropFilter: "blur(2px)",
      }} />

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: S.sans }}>

        {/* NAV */}
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 24px 0", position: "relative", zIndex: 10 }}>
          <nav style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(255,255,255,0.22)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.35)", borderRadius: "999px",
            padding: "10px 20px", gap: "32px",
            width: "100%", maxWidth: "500px",
          }}>
            <span style={{
              fontFamily: S.serif, fontStyle: "italic",
              fontSize: "16px", color: "#1a1a1a", fontWeight: 400,
              letterSpacing: "-0.01em", whiteSpace: "nowrap",
            }}>
              Waitlist Roaster
            </span>
            <button
              onClick={handleReset}
              style={{
                background: "#1a1a1a", color: "#fff", border: "none",
                borderRadius: "999px", padding: "8px 20px",
                fontSize: "13px", fontWeight: 500, cursor: "pointer",
                fontFamily: S.sans, whiteSpace: "nowrap", flexShrink: 0,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              New Roast
            </button>
          </nav>
        </div>

        {/* MAIN */}
        <main style={{ flex: 1, maxWidth: "900px", width: "100%", margin: "0 auto", padding: "0 24px 80px" }}>

          {/* HERO + INPUT */}
          {(phase === "input" || phase === "loading") && (
            <div style={{ textAlign: "center", paddingTop: "60px" }}>
              {/* Label */}
              <p className="anim-fadeup" style={{
                fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(0,0,0,0.45)", fontFamily: S.sans,
                marginBottom: "18px", animationDelay: "0s",
              }}>
                Waitlist Roaster
              </p>

              {/* Headline */}
              <h1 className="anim-fadeup" style={{
                fontFamily: S.serif, fontStyle: "italic",
                fontSize: "clamp(40px, 7vw, 72px)", color: "#1a1a1a",
                lineHeight: 1.1, letterSpacing: "-0.025em",
                marginBottom: "18px", animationDelay: "0.15s",
              }}>
                Your landing page is lying.
              </h1>

              {/* Subtext */}
              <p className="anim-fadeup" style={{
                fontSize: "16px", color: "rgba(0,0,0,0.5)",
                lineHeight: 1.6, marginBottom: "36px", animationDelay: "0.25s",
              }}>
                Paste your copy. A seed investor reads it. No mercy.
              </p>

              {/* Input card */}
              <div className="anim-fadeup" style={{
                maxWidth: "640px", margin: "0 auto",
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.6)",
                borderRadius: "20px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
                padding: "24px",
                animationDelay: "0.35s",
              }}>
                <textarea
                  value={copyText}
                  onChange={e => setCopyText(e.target.value)}
                  placeholder="Paste your hero — headline, subheadline, body, CTA."
                  disabled={phase === "loading"}
                  style={{
                    width: "100%", minHeight: "100px", maxHeight: "280px",
                    border: "none", outline: "none", resize: "vertical",
                    fontSize: "15px", color: "#1a1a1a", fontFamily: S.sans,
                    lineHeight: 1.65, background: "transparent", display: "block",
                  }}
                />
                {/* Bottom row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px" }}>
                  <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.3)", fontFamily: S.sans }}>
                    {charCount} chars
                  </span>
                  <button
                    onClick={handleRoast}
                    disabled={phase === "loading" || !copyText.trim()}
                    title="Roast it"
                    style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      background: phase === "loading" || !copyText.trim() ? "#555" : "#1a1a1a",
                      border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: phase === "loading" || !copyText.trim() ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      transform: phase === "loading" ? "rotate(45deg)" : "rotate(0deg)",
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      if (phase !== "loading" && copyText.trim()) {
                        e.currentTarget.style.opacity = "0.75";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.transform = phase === "loading" ? "rotate(45deg)" : "rotate(0deg)";
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 12V4M4 8l4-4 4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Loading pill */}
              {phase === "loading" && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                  <div style={{
                    background: "rgba(255,255,255,0.3)", backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)", borderRadius: "999px",
                    padding: "8px 20px", fontSize: "13px", color: "rgba(0,0,0,0.6)",
                    fontFamily: S.sans,
                  }}>
                    <span key={phraseIdx} style={{ animation: "fadeText 0.3s ease" }}>
                      {LOADING_PHRASES[phraseIdx]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESULTS */}
          {phase === "output" && (
            <div style={{ paddingTop: "40px" }}>
              {error && (
                <div style={{
                  background: "rgba(255,100,80,0.1)", borderRadius: "12px",
                  padding: "14px 20px", color: "rgba(180,60,40,0.9)",
                  fontSize: "14px", marginBottom: "24px", border: "1px solid rgba(255,100,80,0.2)",
                }}>
                  {error}
                </div>
              )}

              {/* Frosted results canvas */}
              <div style={{
                background: "rgba(255,255,255,0.12)", backdropFilter: "blur(30px)",
                borderRadius: "28px", padding: "32px",
                border: "1px solid rgba(255,255,255,0.25)",
              }}>

                {/* SCORE CARD */}
                <div
                  className={resultsVisible ? "anim-fadeup-fast" : "pre-anim"}
                  style={{
                    background: "rgba(255,255,255,0.2)", backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.35)", borderRadius: "20px",
                    padding: "24px 32px", marginBottom: "20px",
                    display: "flex", alignItems: "flex-start",
                    justifyContent: "space-between", gap: "24px", flexWrap: "wrap",
                  }}
                >
                  {/* Left: score number + label */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{
                      fontFamily: S.serif, fontStyle: "italic",
                      fontSize: "64px", color: "#1a1a1a", lineHeight: 1,
                      fontWeight: 400,
                    }}>
                      {score || "—"}
                    </span>
                    <div>
                      <p style={{
                        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "rgba(0,0,0,0.4)", fontFamily: S.sans, marginBottom: "4px",
                      }}>
                        Clarity Score
                      </p>
                      <p style={{ fontSize: "18px", color: "#1a1a1a", fontWeight: 500, fontFamily: S.sans }}>
                        {scoreVerdict(score)}
                      </p>
                    </div>
                  </div>
                  {/* Right: summary */}
                  {parsed.summary && (
                    <p style={{
                      fontSize: "14px", color: "rgba(0,0,0,0.6)",
                      lineHeight: 1.7, maxWidth: "340px", fontStyle: "italic",
                      fontFamily: S.sans, textAlign: "right", flex: "1 1 200px",
                    }}>
                      {parsed.summary}
                    </p>
                  )}
                </div>

                {/* TWO COLUMNS */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px", alignItems: "start",
                }}>

                  {/* LEFT: Problems + Praise */}
                  <div>
                    <p
                      className={resultsVisible ? "anim-fadein" : "pre-anim"}
                      style={{
                        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                        color: TERRA, fontFamily: S.sans, fontWeight: 600,
                        marginBottom: "12px", animationDelay: "0.1s",
                      }}
                    >
                      5 Problems
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(parsed.problems.length > 0 ? parsed.problems : Array(5).fill(null)).map((c, i) => (
                        <div
                          key={i}
                          className={`glass-card ${resultsVisible ? "anim-fadeup-stagger" : "pre-anim"}`}
                          style={{
                            background: "rgba(255,255,255,0.18)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(255,255,255,0.3)",
                            borderRadius: "16px", padding: "16px 20px",
                            animationDelay: `${0.15 + i * 0.08}s`,
                            minHeight: c ? undefined : "64px",
                          }}
                        >
                          {c ? (
                            <>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                                <p style={{
                                  fontSize: "14px", fontWeight: 500, color: "#1a1a1a",
                                  lineHeight: 1.4, fontFamily: S.sans,
                                }}>
                                  {c.verdict}
                                </p>
                                <CopyIcon text={c.verdict} ck={`prob-${i}`} copiedKey={copiedKey} onCopy={copy} />
                              </div>
                              <p style={{
                                fontSize: "13px", color: "rgba(0,0,0,0.5)",
                                lineHeight: 1.55, marginTop: "6px", fontFamily: S.sans,
                              }}>
                                {c.explanation}
                              </p>
                            </>
                          ) : (
                            streaming && (
                              <div style={{
                                height: "32px", background: "rgba(255,255,255,0.3)",
                                borderRadius: "6px", animation: "pulse 1.5s ease-in-out infinite",
                              }} />
                            )
                          )}
                        </div>
                      ))}
                    </div>

                    {/* PRAISE */}
                    {parsed.praise.length > 0 && (
                      <div style={{ marginTop: "20px" }}>
                        <p style={{
                          fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                          color: GREEN, fontFamily: S.sans, fontWeight: 600, marginBottom: "10px",
                        }}>
                          What Works
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {parsed.praise.map((p, i) => (
                            <div
                              key={i}
                              className="glass-card"
                              style={{
                                background: "rgba(255,255,255,0.18)",
                                backdropFilter: "blur(16px)",
                                border: "1px solid rgba(60,140,90,0.25)",
                                borderRadius: "16px", padding: "16px 20px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                                <p style={{
                                  fontSize: "14px", fontWeight: 500, color: "#1a1a1a",
                                  lineHeight: 1.4, fontFamily: S.sans,
                                }}>
                                  <span style={{ color: GREEN, marginRight: "6px" }}>✓</span>
                                  {p.verdict}
                                </p>
                                <CopyIcon text={p.verdict} ck={`praise-${i}`} copiedKey={copiedKey} onCopy={copy} />
                              </div>
                              <p style={{
                                fontSize: "13px", color: "rgba(0,0,0,0.5)",
                                lineHeight: 1.55, marginTop: "6px", fontFamily: S.sans,
                              }}>
                                {p.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Rewrite */}
                  <div>
                    <p
                      className={resultsVisible ? "anim-fadein" : "pre-anim"}
                      style={{
                        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                        color: GREEN, fontFamily: S.sans, fontWeight: 600,
                        marginBottom: "12px", animationDelay: "0.1s",
                      }}
                    >
                      Rewrite
                    </p>
                    <div
                      className={resultsVisible ? "anim-slidein" : "pre-anim"}
                      style={{
                        background: "rgba(255,255,255,0.22)", backdropFilter: "blur(24px)",
                        border: "1px solid rgba(255,255,255,0.4)", borderRadius: "20px",
                        padding: "28px 24px", position: "relative",
                        animationDelay: "0.15s",
                      }}
                    >
                      {/* Copy all */}
                      <div style={{ position: "absolute", top: "16px", right: "16px" }}>
                        <CopyPill text={rewriteAll} ck="rewrite-all" copiedKey={copiedKey} onCopy={copy} />
                      </div>

                      {parsed.rewrite.headline ? (
                        <p style={{
                          fontFamily: S.serif, fontStyle: "italic",
                          fontSize: "28px", color: "#1a1a1a", lineHeight: 1.25,
                          paddingRight: "80px", marginBottom: "10px",
                        }}>
                          {parsed.rewrite.headline}
                        </p>
                      ) : streaming ? (
                        <div style={{ height: "56px", background: "rgba(0,0,0,0.06)", borderRadius: "8px", marginBottom: "10px", animation: "pulse 1.5s ease-in-out infinite" }} />
                      ) : null}

                      {parsed.rewrite.subheadline && (
                        <p style={{
                          fontSize: "15px", color: "rgba(0,0,0,0.65)",
                          lineHeight: 1.6, fontFamily: S.sans, marginBottom: "8px",
                        }}>
                          {parsed.rewrite.subheadline}
                        </p>
                      )}

                      {parsed.rewrite.body && (
                        <p style={{
                          fontSize: "13px", color: "rgba(0,0,0,0.45)",
                          lineHeight: 1.6, fontFamily: S.sans, marginBottom: "8px",
                        }}>
                          {parsed.rewrite.body}
                        </p>
                      )}

                      {parsed.rewrite.cta && (
                        <div style={{ marginTop: "20px" }}>
                          <span style={{
                            display: "inline-block", background: "#1a1a1a",
                            color: "#fff", borderRadius: "999px", padding: "10px 24px",
                            fontSize: "14px", fontWeight: 500, fontFamily: S.sans,
                          }}>
                            {parsed.rewrite.cta}
                          </span>
                        </div>
                      )}

                      {parsed.rewrite.decision && (
                        <>
                          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", margin: "20px 0 0" }} />
                          <p style={{
                            fontSize: "12px", fontStyle: "italic", color: "rgba(0,0,0,0.4)",
                            lineHeight: 1.6, fontFamily: S.sans, marginTop: "16px",
                          }}>
                            {parsed.rewrite.decision}
                          </p>
                        </>
                      )}

                      {streaming && !parsed.rewrite.headline && (
                        <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.3)", fontFamily: S.sans }}>Rewrite coming…</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Roast another */}
                <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
                  <button
                    onClick={handleReset}
                    className="roast-another"
                    style={{
                      background: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.35)", borderRadius: "999px",
                      padding: "12px 28px", fontSize: "14px", color: "#1a1a1a",
                      cursor: "pointer", fontFamily: S.sans,
                      transition: "all 0.15s ease-out", fontWeight: 500,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.35)";
                      e.currentTarget.style.paddingRight = "31px";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                      e.currentTarget.style.paddingRight = "28px";
                    }}
                  >
                    Roast another →
                  </button>
                </div>

              </div>{/* end frosted canvas */}

            </div>
          )}

          {/* HISTORY */}
          {history.length > 0 && (
            <div style={{ marginTop: "60px" }}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: "12px",
                marginBottom: "18px", paddingBottom: "12px",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
              }}>
                <h2 style={{
                  fontFamily: S.serif, fontStyle: "italic",
                  fontSize: "22px", color: "#1a1a1a", letterSpacing: "-0.02em",
                }}>
                  Previous Roasts
                </h2>
                <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.35)", fontFamily: S.sans }}>
                  {history.length} session{history.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                {history.map((entry, i) => (
                  <GlassCard
                    key={entry.id}
                    style={{ cursor: "pointer", borderRadius: "16px" }}
                    onClick={() => handleViewHistory(entry)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <span style={{
                        width: "22px", height: "22px", borderRadius: "50%",
                        background: "rgba(180,80,60,0.1)", border: "1px solid rgba(180,80,60,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, color: TERRA,
                        fontFamily: S.sans, flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{
                        fontSize: "11px", color: "rgba(0,0,0,0.4)", fontStyle: "italic",
                        fontFamily: S.sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>"{entry.inputSnippet}"</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontFamily: S.serif, fontStyle: "italic", fontSize: "22px", color: "#1a1a1a" }}>
                        {entry.score}
                      </span>
                      <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.5)", fontFamily: S.sans }}>
                        {scoreVerdict(entry.score)}
                      </span>
                    </div>
                    {entry.parsed.rewrite.headline && (
                      <p style={{
                        fontSize: "13px", color: "rgba(0,0,0,0.7)", fontFamily: S.serif,
                        fontStyle: "italic", lineHeight: 1.4, marginBottom: "8px",
                      }}>
                        {entry.parsed.rewrite.headline}
                      </p>
                    )}
                    <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.3)", fontFamily: S.sans }}>
                      View full roast →
                    </p>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* FOOTER */}
        <footer style={{ textAlign: "center", padding: "0 24px 40px" }}>
          <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.35)", fontFamily: S.sans }}>
            Built by{" "}
            <a
              href="https://kaliyugg.framer.website/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "rgba(0,0,0,0.5)", textDecoration: "underline",
                textUnderlineOffset: "2px", transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#1a1a1a"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(0,0,0,0.5)"; }}
            >
              KALIYUGG
            </a>
          </p>
        </footer>

      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        @keyframes fadeText {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .anim-fadeup {
          opacity: 0;
          animation: fadeUp 0.5s ease-out forwards;
        }
        .anim-fadeup-fast {
          opacity: 0;
          animation: fadeUp 0.4s ease-out forwards;
        }
        .anim-fadeup-stagger {
          opacity: 0;
          animation: fadeUp 0.35s ease-out forwards;
        }
        .anim-fadein {
          opacity: 0;
          animation: fadeIn 0.35s ease-out forwards;
        }
        .anim-slidein {
          opacity: 0;
          animation: slideIn 0.4s ease-out forwards;
        }
        .pre-anim {
          opacity: 0;
        }

        .glass-card:hover {
          border-color: rgba(255,255,255,0.55) !important;
          transform: scale(1.012);
        }

        .glass-card:hover .copy-icon {
          opacity: 1 !important;
        }

        textarea::placeholder { color: rgba(0,0,0,0.35); }
        * { box-sizing: border-box; }
      `}</style>
    </>
  );
}
