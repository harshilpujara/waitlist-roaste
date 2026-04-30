import { useState, useRef, useEffect, useCallback } from "react";

type Phase = "input" | "loading" | "output";

interface RoastEntry {
  id: number;
  inputSnippet: string;
  roast: string;
  rewrite: string;
  timestamp: Date;
}

const LOADING_PHRASES = [
  "Reading between the lines…",
  "Finding the corporate jargon…",
  "Preparing the hard truth…",
];

function parseOutput(text: string): { roast: string; rewrite: string } {
  const roastMatch = text.match(/ROAST:([\s\S]*?)(?=REWRITE:|$)/i);
  const rewriteMatch = text.match(/REWRITE:([\s\S]*?)$/i);
  return {
    roast: roastMatch ? roastMatch[1].trim() : "",
    rewrite: rewriteMatch ? rewriteMatch[1].trim() : "",
  };
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: create textarea and execCommand
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        backgroundColor: copied ? "rgba(68,204,102,0.15)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "rgba(68,204,102,0.4)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: "20px",
        padding: "5px 12px",
        fontSize: "11px",
        fontWeight: 600,
        color: copied ? "#44cc66" : "#aaa",
        cursor: text ? "pointer" : "not-allowed",
        transition: "all 0.2s",
        letterSpacing: "0.04em",
        fontFamily: "'Inter', system-ui, sans-serif",
        opacity: text ? 1 : 0.4,
      }}
      onMouseEnter={(e) => {
        if (!text || copied) return;
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.10)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        if (copied) return;
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = "#aaa";
      }}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#44cc66" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M1 8V2.5A1.5 1.5 0 012.5 1H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function HistoryCard({ entry, index, onClick }: { entry: RoastEntry; index: number; onClick: () => void }) {
  const { roast, rewrite } = entry;
  const roastPreview = roast.split("\n").find((l) => l.trim()) ?? roast.slice(0, 80);
  const rewriteLines = rewrite.split("\n").filter((l) => l.trim());
  const headlineLine = rewriteLines.find((l) => /headline/i.test(l)) ?? rewriteLines[0] ?? "";

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Number badge */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "16px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          backgroundColor: "rgba(255,68,68,0.15)",
          border: "1px solid rgba(255,68,68,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', Menlo, monospace",
          fontSize: "11px",
          fontWeight: 700,
          color: "#ff6666",
        }}
      >
        {index + 1}
      </div>

      {/* Input snippet */}
      <p
        style={{
          fontSize: "12px",
          color: "#555",
          fontFamily: "'Inter', system-ui, sans-serif",
          marginBottom: "12px",
          paddingRight: "36px",
          fontStyle: "italic",
          lineHeight: 1.5,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
        }}
      >
        "{entry.inputSnippet}"
      </p>

      {/* Labels row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <span style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#ff4444",
          fontFamily: "'JetBrains Mono', Menlo, monospace",
        }}>
          ROAST
        </span>
        <span style={{ color: "#333", fontSize: "10px" }}>·</span>
        <span style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#44cc66",
          fontFamily: "'JetBrains Mono', Menlo, monospace",
        }}>
          REWRITE
        </span>
      </div>

      {/* Roast preview */}
      <p
        style={{
          fontSize: "12px",
          color: "#888",
          fontFamily: "'JetBrains Mono', Menlo, monospace",
          lineHeight: 1.5,
          marginBottom: "8px",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {roastPreview}
      </p>

      {/* Rewrite headline preview */}
      {headlineLine && (
        <p
          style={{
            fontSize: "12px",
            color: "#5a8a60",
            fontFamily: "'JetBrains Mono', Menlo, monospace",
            lineHeight: 1.5,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
        >
          {headlineLine}
        </p>
      )}

      {/* Click hint */}
      <p style={{
        marginTop: "10px",
        fontSize: "10px",
        color: "#333",
        fontFamily: "'Inter', system-ui, sans-serif",
        letterSpacing: "0.03em",
      }}>
        Click to view full roast →
      </p>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [copy, setCopy] = useState("");
  const [output, setOutput] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [history, setHistory] = useState<RoastEntry[]>([]);
  const [viewingHistory, setViewingHistory] = useState<RoastEntry | null>(null);
  const outputRef = useRef<string>("");
  const currentCopyRef = useRef<string>("");
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    if (phase === "loading") {
      phraseTimer.current = setInterval(() => {
        setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
      }, 2000);
    } else {
      if (phraseTimer.current) clearInterval(phraseTimer.current);
    }
    return () => {
      if (phraseTimer.current) clearInterval(phraseTimer.current);
    };
  }, [phase]);

  const handleRoast = useCallback(async () => {
    if (!copy.trim()) return;
    currentCopyRef.current = copy.trim();
    setPhase("loading");
    setError("");
    setOutput("");
    setViewingHistory(null);
    outputRef.current = "";
    setStreaming(true);
    setPhraseIndex(0);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy }),
      });

      if (!res.ok || !res.body) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setPhase("output");

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
              // Save to history
              const { roast, rewrite } = parseOutput(outputRef.current);
              if (roast || rewrite) {
                idCounter.current += 1;
                setHistory((prev) => [
                  {
                    id: idCounter.current,
                    inputSnippet: currentCopyRef.current.slice(0, 80),
                    roast,
                    rewrite,
                    timestamp: new Date(),
                  },
                  ...prev,
                ]);
              }
              return;
            }
            if (parsed.error) {
              setError(parsed.error);
              setStreaming(false);
              return;
            }
            if (parsed.content) {
              outputRef.current += parsed.content;
              setOutput(outputRef.current);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      setError("Connection failed. Please try again.");
      setPhase("input");
    } finally {
      setStreaming(false);
    }
  }, [copy]);

  function handleReset() {
    setPhase("input");
    setCopy("");
    setOutput("");
    setError("");
    setStreaming(false);
    setViewingHistory(null);
    outputRef.current = "";
  }

  function handleViewHistory(entry: RoastEntry) {
    setViewingHistory(entry);
    setOutput(`ROAST:\n${entry.roast}\n\nREWRITE:\n${entry.rewrite}`);
    outputRef.current = `ROAST:\n${entry.roast}\n\nREWRITE:\n${entry.rewrite}`;
    setPhase("output");
    setStreaming(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeOutput = viewingHistory
    ? { roast: viewingHistory.roast, rewrite: viewingHistory.rewrite }
    : parseOutput(output);

  const { roast, rewrite } = activeOutput;

  const S = {
    mono: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
    serif: "'Playfair Display', Georgia, serif",
    sans: "'Inter', system-ui, sans-serif",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#0e0e0e",
      color: "#e8e8e8",
      fontFamily: S.sans,
    }}>

      {/* NAV */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        backgroundColor: "rgba(14,14,14,0.85)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px",
            borderRadius: "8px",
            backgroundColor: "#ff4444",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 11L7 3l5 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 8h5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{
            fontFamily: S.serif,
            fontWeight: 700,
            fontSize: "16px",
            color: "#f0f0f0",
            letterSpacing: "-0.01em",
          }}>
            Waitlist Roaster
          </span>
        </div>

        {/* Nav right */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {history.length > 0 && (
            <span style={{
              fontFamily: S.mono,
              fontSize: "11px",
              color: "#555",
              letterSpacing: "0.05em",
            }}>
              {history.length} roast{history.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={handleReset}
            style={{
              backgroundColor: "#1a1a1a",
              color: "#ccc",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "20px",
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: S.sans,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#252525";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1a1a1a";
              e.currentTarget.style.color = "#ccc";
            }}
          >
            New Roast
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ flex: 1, width: "100%", maxWidth: "960px", margin: "0 auto", padding: "0 24px 60px" }}>

        {/* ── INPUT / LOADING SECTION ── */}
        {(phase === "input" || phase === "loading") && (
          <div style={{ textAlign: "center", paddingTop: "72px" }}>
            {/* Eyebrow */}
            <p style={{
              fontFamily: S.mono,
              fontSize: "11px",
              letterSpacing: "0.14em",
              color: "#ff4444",
              textTransform: "uppercase",
              marginBottom: "20px",
            }}>
              Seed-investor grade copy review
            </p>

            {/* Headline */}
            <h1 style={{
              fontFamily: S.serif,
              fontWeight: 800,
              fontSize: "clamp(32px, 6vw, 62px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "#f2f2f2",
              marginBottom: "16px",
              maxWidth: "720px",
              margin: "0 auto 16px",
            }}>
              Paste your landing page copy.{" "}
              <em style={{ color: "#ff4444", fontStyle: "italic" }}>Get Roasted.</em>
            </h1>

            {/* Subline */}
            <p style={{
              fontFamily: S.sans,
              fontSize: "17px",
              color: "#666",
              lineHeight: 1.6,
              maxWidth: "480px",
              margin: "0 auto 44px",
            }}>
              A seed investor reviews your hero section and tells you exactly what's wrong — then rewrites it.
            </p>

            {/* Glass textarea card */}
            <div style={{
              maxWidth: "680px",
              margin: "0 auto",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "20px",
              padding: "4px",
              backdropFilter: "blur(20px)",
            }}>
              <textarea
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Paste your hero section copy here — headline, subheadline, body, CTA."
                disabled={phase === "loading"}
                style={{
                  width: "100%",
                  minHeight: "180px",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "18px",
                  color: "#e0e0e0",
                  fontSize: "15px",
                  lineHeight: 1.65,
                  padding: "20px 22px 16px",
                  resize: "vertical",
                  fontFamily: S.sans,
                  outline: "none",
                }}
              />
              {/* Bottom row inside card */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "8px 12px 12px",
              }}>
                <button
                  onClick={handleRoast}
                  disabled={phase === "loading" || !copy.trim()}
                  style={{
                    backgroundColor: "#ff4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "14px",
                    padding: "13px 28px",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: phase === "loading" || !copy.trim() ? "not-allowed" : "pointer",
                    opacity: phase === "loading" || !copy.trim() ? 0.5 : 1,
                    transition: "all 0.15s",
                    fontFamily: S.sans,
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) => {
                    if (phase === "loading" || !copy.trim()) return;
                    e.currentTarget.style.backgroundColor = "#e03333";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ff4444";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {phase === "loading" ? "Roasting…" : "Roast it."}
                </button>
              </div>
            </div>

            {/* LOADING PHRASE */}
            {phase === "loading" && (
              <div style={{
                marginTop: "28px",
                fontFamily: S.mono,
                fontSize: "13px",
                color: "#555",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                minHeight: "22px",
              }}>
                <span style={{
                  display: "inline-block", width: "6px", height: "6px",
                  borderRadius: "50%", backgroundColor: "#ff4444",
                  animation: "blink 1s step-start infinite",
                }} />
                <span key={phraseIndex} style={{ animation: "fadeIn 0.3s ease forwards" }}>
                  {LOADING_PHRASES[phraseIndex]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── OUTPUT SECTION ── */}
        {phase === "output" && (
          <div style={{ animation: "fadeIn 0.4s ease forwards", paddingTop: "40px" }}>

            {/* History breadcrumb when viewing old roast */}
            {viewingHistory && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                marginBottom: "20px",
              }}>
                <button
                  onClick={handleReset}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "13px", color: "#666", fontFamily: S.sans,
                    padding: "0", display: "flex", alignItems: "center", gap: "4px",
                  }}
                >
                  ← Back
                </button>
                <span style={{ color: "#333", fontSize: "13px" }}>·</span>
                <span style={{
                  fontFamily: S.mono, fontSize: "11px", color: "#555",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Roast #{history.findIndex(h => h.id === viewingHistory.id) + 1}
                </span>
              </div>
            )}

            {error && (
              <div style={{
                backgroundColor: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.2)",
                borderRadius: "12px",
                padding: "14px 18px",
                color: "#ff8080",
                fontSize: "14px",
                marginBottom: "24px",
                fontFamily: S.sans,
              }}>
                {error}
              </div>
            )}

            {/* Output headline */}
            {!viewingHistory && (
              <div style={{ marginBottom: "28px", textAlign: "center" }}>
                <h2 style={{
                  fontFamily: S.serif,
                  fontWeight: 700,
                  fontSize: "clamp(22px, 3.5vw, 36px)",
                  color: "#f0f0f0",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}>
                  Here's your <em style={{ color: "#ff4444" }}>roast</em>
                </h2>
              </div>
            )}

            {/* Two panels */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}>
              {/* ROAST PANEL */}
              <div style={{
                backgroundColor: "rgba(255,68,68,0.04)",
                border: "1px solid rgba(255,68,68,0.14)",
                borderRadius: "18px",
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,68,68,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span style={{
                    fontFamily: S.mono,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#ff4444",
                    letterSpacing: "0.14em",
                  }}>
                    ROAST
                  </span>
                  <CopyButton text={roast} label="Copy roast" />
                </div>
                <div style={{
                  padding: "20px",
                  fontFamily: S.mono,
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "#c8c8c8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  minHeight: "220px",
                }}>
                  {roast || (streaming ? (
                    <span style={{ color: "#444" }}>Thinking…</span>
                  ) : "")}
                  {streaming && roast && (
                    <span style={{
                      display: "inline-block", width: "2px", height: "1.1em",
                      backgroundColor: "#ff4444", verticalAlign: "middle",
                      marginLeft: "2px", animation: "blink 1s step-start infinite",
                    }} />
                  )}
                </div>
              </div>

              {/* REWRITE PANEL */}
              <div style={{
                backgroundColor: "rgba(68,204,102,0.04)",
                border: "1px solid rgba(68,204,102,0.14)",
                borderRadius: "18px",
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(68,204,102,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span style={{
                    fontFamily: S.mono,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#44cc66",
                    letterSpacing: "0.14em",
                  }}>
                    REWRITE
                  </span>
                  <CopyButton text={rewrite} label="Copy rewrite" />
                </div>
                <div style={{
                  padding: "20px",
                  fontFamily: S.mono,
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "#c8c8c8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  minHeight: "220px",
                }}>
                  {rewrite || ""}
                  {streaming && rewrite && (
                    <span style={{
                      display: "inline-block", width: "2px", height: "1.1em",
                      backgroundColor: "#44cc66", verticalAlign: "middle",
                      marginLeft: "2px", animation: "blink 1s step-start infinite",
                    }} />
                  )}
                  {streaming && !rewrite && roast && (
                    <span style={{ color: "#444" }}>Coming up…</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={handleReset}
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "#ccc",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "20px",
                  padding: "11px 22px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: S.sans,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#252525";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a1a1a";
                  e.currentTarget.style.color = "#ccc";
                }}
              >
                Roast another →
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY SECTION ── */}
        {history.length > 0 && (
          <div style={{ marginTop: phase === "output" ? "60px" : "72px" }}>
            {/* Section header */}
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              marginBottom: "20px",
              paddingBottom: "14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <h2 style={{
                fontFamily: S.serif,
                fontWeight: 700,
                fontSize: "22px",
                color: "#d0d0d0",
                letterSpacing: "-0.02em",
              }}>
                Previous Roasts
              </h2>
              <span style={{
                fontFamily: S.mono,
                fontSize: "11px",
                color: "#444",
                letterSpacing: "0.06em",
              }}>
                {history.length} session{history.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Cards grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "14px",
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

      </main>

      {/* FOOTER */}
      <footer style={{
        padding: "20px 32px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        textAlign: "center",
      }}>
        <span style={{
          fontFamily: S.mono,
          fontSize: "11px",
          color: "#333",
          letterSpacing: "0.06em",
        }}>
          Built by KALIYUGG
        </span>
      </footer>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        textarea::placeholder { color: #444; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
