import { useState, useRef, useEffect, useCallback } from "react";

type Phase = "input" | "loading" | "output";

interface RoastCallout {
  verdict: string;
  explanation: string;
}

interface RewriteFields {
  headline: string;
  subheadline: string;
  body: string;
  cta: string;
  decision: string;
}

interface HistoryEntry {
  id: number;
  inputSnippet: string;
  callouts: RoastCallout[];
  rewrite: RewriteFields;
}

const LOADING_PHRASES = [
  "Scanning for corporate jargon",
  "Identifying empty phrases",
  "Preparing the hard truth",
];

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseCallouts(roastText: string): RoastCallout[] {
  const lines = roastText.split("\n").map((l) => l.trim()).filter(Boolean);
  const callouts: RoastCallout[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^\d+\.\s*/, "");
    const slashIdx = cleaned.indexOf("//");
    if (slashIdx !== -1) {
      callouts.push({
        verdict: cleaned.slice(0, slashIdx).trim(),
        explanation: cleaned.slice(slashIdx + 2).trim(),
      });
    }
  }
  return callouts;
}

function parseRewrite(rewriteText: string): RewriteFields {
  const get = (key: string) => {
    const re = new RegExp(`^${key}:?\\s*(.+)$`, "im");
    const m = rewriteText.match(re);
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

function splitOutput(raw: string): { roastText: string; rewriteText: string } {
  const rewriteIdx = raw.search(/^REWRITE:?/im);
  if (rewriteIdx === -1) {
    return { roastText: raw, rewriteText: "" };
  }
  const roastText = raw.slice(0, rewriteIdx).replace(/^ROAST:?/im, "").trim();
  const rewriteText = raw.slice(rewriteIdx).replace(/^REWRITE:?/im, "").trim();
  return { roastText, rewriteText };
}

// ── Copy util ─────────────────────────────────────────────────────────────────

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);
  return { copy, copiedKey };
}

// ── Components ────────────────────────────────────────────────────────────────

function CopyIconBtn({ text, copyKey, copiedKey, onCopy }: {
  text: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const done = copiedKey === copyKey;
  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      title="Copy"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px",
        color: done ? "rgba(100,220,160,0.9)" : "rgba(255,255,255,0.3)",
        transition: "color 0.2s ease",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
      }}
      onMouseEnter={(e) => { if (!done) e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={(e) => { if (!done) e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
    >
      {done ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1.5 9.5V2.5a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

function CopyPillBtn({ text, copyKey, copiedKey, onCopy, label = "Copy all" }: {
  text: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  label?: string;
}) {
  const done = copiedKey === copyKey;
  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      style={{
        background: done ? "rgba(100,220,160,0.15)" : "rgba(255,255,255,0.10)",
        border: `1px solid ${done ? "rgba(100,220,160,0.3)" : "rgba(255,255,255,0.15)"}`,
        borderRadius: "999px",
        padding: "4px 12px",
        fontSize: "12px",
        color: done ? "rgba(100,220,160,0.9)" : "#fff",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        if (!done) e.currentTarget.style.background = "rgba(255,255,255,0.16)";
      }}
      onMouseLeave={(e) => {
        if (!done) e.currentTarget.style.background = "rgba(255,255,255,0.10)";
      }}
    >
      {done ? "Copied!" : label}
    </button>
  );
}

// ── History Card ──────────────────────────────────────────────────────────────

function HistoryCard({ entry, index, onClick }: {
  entry: HistoryEntry;
  index: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <span style={{
          width: "22px", height: "22px", borderRadius: "50%",
          background: "rgba(255,100,80,0.15)",
          border: "1px solid rgba(255,100,80,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "10px", fontWeight: 700,
          color: "rgba(255,100,80,0.9)",
          fontFamily: "'JetBrains Mono', Menlo, monospace",
          flexShrink: 0,
        }}>{index + 1}</span>
        <span style={{
          fontSize: "11px", color: "rgba(255,255,255,0.35)",
          fontFamily: "'Inter', system-ui, sans-serif",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontStyle: "italic",
        }}>"{entry.inputSnippet}"</span>
      </div>
      {entry.rewrite.headline && (
        <p style={{
          fontSize: "13px", color: "rgba(255,255,255,0.8)",
          fontFamily: "'Playfair Display', Georgia, serif",
          lineHeight: 1.4, marginBottom: "6px",
        }}>
          {entry.rewrite.headline}
        </p>
      )}
      {entry.callouts[0] && (
        <p style={{
          fontSize: "12px", color: "rgba(255,255,255,0.35)",
          fontFamily: "'Inter', system-ui, sans-serif",
          lineHeight: 1.4,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
        }}>
          {entry.callouts[0].verdict}
        </p>
      )}
      <p style={{ marginTop: "10px", fontSize: "11px", color: "rgba(255,255,255,0.2)", fontFamily: "'Inter', system-ui, sans-serif" }}>
        View full roast →
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [copyText, setCopyText] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);

  const rawRef = useRef<string>("");
  const currentCopyRef = useRef<string>("");
  const idRef = useRef(0);
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { copy, copiedKey } = useCopy();

  useEffect(() => {
    if (phase === "loading") {
      phraseTimer.current = setInterval(() => {
        setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
      }, 2000);
    } else {
      if (phraseTimer.current) clearInterval(phraseTimer.current);
    }
    return () => { if (phraseTimer.current) clearInterval(phraseTimer.current); };
  }, [phase]);

  const handleRoast = useCallback(async () => {
    if (!copyText.trim()) return;
    currentCopyRef.current = copyText.trim();
    rawRef.current = "";
    setRawOutput("");
    setError("");
    setViewingEntry(null);
    setStreaming(true);
    setPhraseIndex(0);
    setPhase("loading");

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy: copyText }),
      });
      if (!res.ok || !res.body) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let outputStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.done) {
              setStreaming(false);
              const { roastText, rewriteText } = splitOutput(rawRef.current);
              const callouts = parseCallouts(roastText);
              const rewrite = parseRewrite(rewriteText);
              if (callouts.length > 0 || rewrite.headline) {
                idRef.current += 1;
                setHistory((prev) => [{
                  id: idRef.current,
                  inputSnippet: currentCopyRef.current.slice(0, 70),
                  callouts,
                  rewrite,
                }, ...prev]);
              }
              return;
            }
            if (parsed.error) {
              setError(parsed.error);
              setStreaming(false);
              setPhase("input");
              return;
            }
            if (parsed.content) {
              rawRef.current += parsed.content;
              setRawOutput(rawRef.current);
              if (!outputStarted) {
                outputStarted = true;
                setPhase("output");
              }
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
    setPhase("input");
    setCopyText("");
    setRawOutput("");
    setError("");
    setStreaming(false);
    setViewingEntry(null);
    rawRef.current = "";
  }

  function handleViewHistory(entry: HistoryEntry) {
    setViewingEntry(entry);
    setStreaming(false);
    setPhase("output");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Parse active output
  let callouts: RoastCallout[] = [];
  let rewrite: RewriteFields = { headline: "", subheadline: "", body: "", cta: "", decision: "" };

  if (viewingEntry) {
    callouts = viewingEntry.callouts;
    rewrite = viewingEntry.rewrite;
  } else if (rawOutput) {
    const { roastText, rewriteText } = splitOutput(rawOutput);
    callouts = parseCallouts(roastText);
    rewrite = parseRewrite(rewriteText);
  }

  const rewriteAllText = [
    rewrite.headline && `Headline: ${rewrite.headline}`,
    rewrite.subheadline && `Subheadline: ${rewrite.subheadline}`,
    rewrite.body && `Body: ${rewrite.body}`,
    rewrite.cta && `CTA: ${rewrite.cta}`,
    rewrite.decision && `Decision: ${rewrite.decision}`,
  ].filter(Boolean).join("\n");

  const S = {
    sans: "'Inter', system-ui, sans-serif",
    serif: "'Playfair Display', Georgia, serif",
    mono: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #1a1f35 0%, #0f1220 60%, #1a1030 100%)",
      color: "#fff",
      fontFamily: S.sans,
      position: "relative",
    }}>
      {/* Noise texture */}
      <svg style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, opacity: 0.035 }} xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)"/>
      </svg>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── NAVBAR ── */}
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 24px 0" }}>
          <nav style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "999px",
            padding: "10px 16px",
            gap: "40px",
            width: "100%",
            maxWidth: "520px",
          }}>
            <span style={{
              fontFamily: S.serif,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "15px",
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}>
              Waitlist Roaster
            </span>
            <button
              onClick={handleReset}
              style={{
                background: "#0f1220",
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "999px",
                padding: "7px 18px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: S.sans,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1a2240";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0f1220";
                e.currentTarget.style.color = "rgba(255,255,255,0.85)";
              }}
            >
              New Roast
            </button>
          </nav>
        </div>

        {/* ── HERO ── */}
        <div style={{ textAlign: "center", padding: "56px 24px 40px" }}>
          <p style={{
            fontSize: "11px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            fontFamily: S.sans,
            marginBottom: "18px",
          }}>
            Waitlist Roaster
          </p>
          <h1 style={{
            fontFamily: S.serif,
            fontWeight: 800,
            fontSize: "clamp(34px, 6vw, 64px)",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: "#fff",
            marginBottom: "16px",
          }}>
            Your landing page is lying.
          </h1>
          <p style={{
            fontSize: "17px",
            color: "rgba(255,255,255,0.6)",
            fontFamily: S.sans,
            letterSpacing: "-0.005em",
          }}>
            Paste your copy. Get the truth.
          </p>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ maxWidth: "920px", margin: "0 auto", padding: "0 24px 80px" }}>

          {/* INPUT / LOADING */}
          {(phase === "input" || phase === "loading") && (
            <div style={{ maxWidth: "620px", margin: "0 auto" }}>
              {/* White card */}
              <div style={{
                background: "rgba(255,255,255,0.92)",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
              }}>
                <textarea
                  value={copyText}
                  onChange={(e) => setCopyText(e.target.value)}
                  placeholder="Paste your hero section — headline, subheadline, body, CTA."
                  disabled={phase === "loading"}
                  style={{
                    width: "100%",
                    minHeight: "160px",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    fontSize: "15px",
                    color: "#1a1a2e",
                    fontFamily: S.sans,
                    lineHeight: 1.65,
                    background: "transparent",
                    display: "block",
                  }}
                />
                {/* Bottom row */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button
                    onClick={handleRoast}
                    disabled={phase === "loading" || !copyText.trim()}
                    title="Roast it"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: phase === "loading" ? "#0f1220" : (!copyText.trim() ? "#555" : "#0f1220"),
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: phase === "loading" || !copyText.trim() ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                      animation: phase === "loading" ? "spin 1s linear infinite" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (phase !== "loading" && copyText.trim()) {
                        e.currentTarget.style.background = "#1a2240";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#0f1220";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    {phase === "loading" ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                        <path d="M9 2a7 7 0 017 7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 12V4M4 8l4-4 4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Loading pill */}
              {phase === "loading" && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                  <div style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "999px",
                    padding: "6px 16px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: S.sans,
                    transition: "all 0.2s ease",
                  }}>
                    <span key={phraseIndex} style={{ animation: "fadeText 0.3s ease" }}>
                      {LOADING_PHRASES[phraseIndex]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OUTPUT */}
          {phase === "output" && (
            <div>
              {error && (
                <div style={{
                  background: "rgba(255,68,68,0.1)",
                  border: "1px solid rgba(255,68,68,0.2)",
                  borderRadius: "12px",
                  padding: "14px 20px",
                  color: "rgba(255,130,130,0.9)",
                  fontSize: "14px",
                  marginBottom: "24px",
                  fontFamily: S.sans,
                }}>
                  {error}
                </div>
              )}

              {/* Two columns */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "20px",
                alignItems: "start",
                marginBottom: "28px",
              }}>
                {/* LEFT — Roast cards */}
                <div>
                  <p style={{
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,100,80,0.9)",
                    fontFamily: S.sans,
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}>
                    5 Problems
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(callouts.length > 0 ? callouts : Array(5).fill(null)).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          backdropFilter: "blur(16px)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          borderRadius: "16px",
                          padding: "16px 20px",
                          position: "relative",
                          minHeight: c ? undefined : "68px",
                        }}
                      >
                        {c ? (
                          <>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                              <p style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#fff",
                                lineHeight: 1.4,
                                fontFamily: S.sans,
                                flex: 1,
                              }}>
                                {c.verdict}
                              </p>
                              <CopyIconBtn
                                text={c.verdict}
                                copyKey={`verdict-${i}`}
                                copiedKey={copiedKey}
                                onCopy={copy}
                              />
                            </div>
                            <p style={{
                              fontSize: "13px",
                              color: "rgba(255,255,255,0.5)",
                              lineHeight: 1.55,
                              marginTop: "6px",
                              fontFamily: S.sans,
                            }}>
                              {c.explanation}
                            </p>
                          </>
                        ) : (
                          <div style={{
                            height: "36px",
                            background: "rgba(255,255,255,0.04)",
                            borderRadius: "6px",
                            animation: streaming ? "pulse 1.5s ease-in-out infinite" : "none",
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT — Rewrite card */}
                <div>
                  <p style={{
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(100,220,160,0.9)",
                    fontFamily: S.sans,
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}>
                    Rewrite
                  </p>
                  <div style={{
                    background: "rgba(255,255,255,0.07)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "20px",
                    padding: "28px 24px",
                    position: "relative",
                  }}>
                    {/* Copy all */}
                    <div style={{ position: "absolute", top: "16px", right: "16px" }}>
                      <CopyPillBtn
                        text={rewriteAllText}
                        copyKey="rewrite-all"
                        copiedKey={copiedKey}
                        onCopy={copy}
                        label="Copy all"
                      />
                    </div>

                    {/* Headline */}
                    {rewrite.headline ? (
                      <p style={{
                        fontFamily: S.serif,
                        fontWeight: 600,
                        fontSize: "26px",
                        color: "#fff",
                        lineHeight: 1.3,
                        letterSpacing: "-0.02em",
                        paddingRight: "80px",
                        marginBottom: "12px",
                      }}>
                        {rewrite.headline}
                      </p>
                    ) : (
                      streaming && (
                        <div style={{
                          height: "60px",
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: "8px",
                          marginBottom: "12px",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }} />
                      )
                    )}

                    {/* Subheadline */}
                    {rewrite.subheadline && (
                      <p style={{
                        fontSize: "15px",
                        color: "rgba(255,255,255,0.7)",
                        lineHeight: 1.6,
                        marginBottom: "8px",
                        fontFamily: S.sans,
                      }}>
                        {rewrite.subheadline}
                      </p>
                    )}

                    {/* Body */}
                    {rewrite.body && (
                      <p style={{
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.45)",
                        lineHeight: 1.6,
                        marginBottom: "8px",
                        fontFamily: S.sans,
                      }}>
                        {rewrite.body}
                      </p>
                    )}

                    {/* CTA */}
                    {rewrite.cta && (
                      <div style={{ marginTop: "20px" }}>
                        <span style={{
                          display: "inline-block",
                          background: "#fff",
                          color: "#0f1220",
                          borderRadius: "999px",
                          padding: "10px 22px",
                          fontSize: "14px",
                          fontWeight: 500,
                          fontFamily: S.sans,
                        }}>
                          {rewrite.cta}
                        </span>
                      </div>
                    )}

                    {/* Decision */}
                    {rewrite.decision && (
                      <>
                        <div style={{
                          height: "1px",
                          background: "rgba(255,255,255,0.08)",
                          margin: "20px 0 16px",
                        }} />
                        <p style={{
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.35)",
                          fontStyle: "italic",
                          lineHeight: 1.6,
                          fontFamily: S.sans,
                        }}>
                          {rewrite.decision}
                        </p>
                      </>
                    )}

                    {/* Streaming placeholder for rewrite */}
                    {streaming && !rewrite.headline && (
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", fontFamily: S.sans }}>
                        Rewrite coming…
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Roast another */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                <button
                  onClick={handleReset}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "999px",
                    padding: "12px 28px",
                    fontSize: "14px",
                    color: "#fff",
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    transition: "background 0.2s ease",
                    fontFamily: S.sans,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                >
                  Roast another
                </button>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {history.length > 0 && (
            <div style={{ marginTop: "64px" }}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: "12px",
                marginBottom: "20px",
                paddingBottom: "14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <h2 style={{
                  fontFamily: S.serif,
                  fontWeight: 700,
                  fontSize: "20px",
                  color: "rgba(255,255,255,0.8)",
                  letterSpacing: "-0.02em",
                }}>
                  Previous Roasts
                </h2>
                <span style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: S.sans,
                  letterSpacing: "0.06em",
                }}>
                  {history.length} session{history.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "12px",
              }}>
                {history.map((entry, i) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    index={i}
                    onClick={() => handleViewHistory(entry)}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <footer style={{ textAlign: "center", padding: "0 24px 40px" }}>
          <p style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.2)",
            fontFamily: S.sans,
          }}>
            Built by KALIYUGG
          </p>
        </footer>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeText {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        textarea::placeholder { color: #888; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
