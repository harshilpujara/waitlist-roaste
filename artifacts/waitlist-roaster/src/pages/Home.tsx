import { useState, useRef, useEffect } from "react";

type Phase = "input" | "loading" | "output";

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

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [copy, setCopy] = useState("");
  const [output, setOutput] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState(false);
  const outputRef = useRef<string>("");
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function handleRoast() {
    if (!copy.trim()) return;
    setPhase("loading");
    setError("");
    setOutput("");
    outputRef.current = "";
    setStreaming(true);
    setPhraseIndex(0);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Server error");
      }

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
            // ignore malformed JSON
          }
        }
      }
    } catch {
      setError("Connection failed. Please try again.");
      setPhase("input");
    } finally {
      setStreaming(false);
    }
  }

  function handleReset() {
    setPhase("input");
    setCopy("");
    setOutput("");
    setError("");
    setStreaming(false);
    outputRef.current = "";
  }

  const { roast, rewrite } = parseOutput(output);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#141414",
        color: "#e8e8e8",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #242424",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "#ff4444",
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
            fontSize: "13px",
            color: "#888",
            letterSpacing: "0.05em",
          }}
        >
          waitlist-roaster
        </span>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
          padding: "60px 24px 40px",
        }}
      >
        {/* INPUT SECTION */}
        {(phase === "input" || phase === "loading") && (
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 34px)",
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: "10px",
                letterSpacing: "-0.02em",
                color: "#f0f0f0",
              }}
            >
              Paste your landing page copy.{" "}
              <span style={{ color: "#ff4444" }}>Get roasted.</span>
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#666",
                marginBottom: "28px",
              }}
            >
              A seed investor reviews your hero section and tells you exactly what's wrong — then rewrites it.
            </p>

            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Paste your hero section copy here — headline, subheadline, body, CTA."
              disabled={phase === "loading"}
              style={{
                width: "100%",
                minHeight: "220px",
                backgroundColor: "#1c1c1c",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                color: "#e8e8e8",
                fontSize: "15px",
                lineHeight: 1.6,
                padding: "16px",
                resize: "vertical",
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#ff4444";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
            />

            <div style={{ marginTop: "14px" }}>
              <button
                onClick={handleRoast}
                disabled={phase === "loading" || !copy.trim()}
                style={{
                  backgroundColor: "#ff4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "13px 28px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: phase === "loading" || !copy.trim() ? "not-allowed" : "pointer",
                  opacity: phase === "loading" || !copy.trim() ? 0.6 : 1,
                  transition: "opacity 0.15s, background-color 0.15s",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => {
                  if (phase !== "loading" && copy.trim()) {
                    e.currentTarget.style.backgroundColor = "#e03333";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff4444";
                }}
              >
                {phase === "loading" ? "Roasting…" : "Roast it."}
              </button>
            </div>

            {/* LOADING STATE */}
            {phase === "loading" && (
              <div
                style={{
                  marginTop: "28px",
                  fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
                  fontSize: "13px",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minHeight: "20px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#ff4444",
                    animation: "blink 1s step-start infinite",
                  }}
                />
                <span
                  key={phraseIndex}
                  style={{
                    animation: "fadeIn 0.3s ease forwards",
                  }}
                >
                  {LOADING_PHRASES[phraseIndex]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* OUTPUT SECTION */}
        {phase === "output" && (
          <div
            style={{
              animation: "fadeIn 0.4s ease forwards",
            }}
          >
            {error && (
              <div
                style={{
                  backgroundColor: "#2a1111",
                  border: "1px solid #5a2020",
                  borderRadius: "6px",
                  padding: "14px 18px",
                  color: "#ff8080",
                  fontSize: "14px",
                  marginBottom: "24px",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "20px",
                marginBottom: "28px",
              }}
            >
              {/* ROAST PANEL */}
              <div
                style={{
                  backgroundColor: "#1a1212",
                  border: "1px solid #3a1a1a",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid #3a1a1a",
                    backgroundColor: "#1f1414",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ff4444",
                      letterSpacing: "0.12em",
                    }}
                  >
                    ROAST
                  </span>
                </div>
                <div
                  style={{
                    padding: "18px",
                    fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
                    fontSize: "13px",
                    lineHeight: 1.75,
                    color: "#d4d4d4",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    minHeight: "200px",
                  }}
                >
                  {roast || (streaming ? <span style={{ color: "#555" }}>Thinking…</span> : "")}
                  {streaming && roast && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "2px",
                        height: "1.1em",
                        backgroundColor: "#ff4444",
                        verticalAlign: "middle",
                        marginLeft: "2px",
                        animation: "blink 1s step-start infinite",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* REWRITE PANEL */}
              <div
                style={{
                  backgroundColor: "#111a12",
                  border: "1px solid #1a3a1a",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid #1a3a1a",
                    backgroundColor: "#121f13",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#44cc66",
                      letterSpacing: "0.12em",
                    }}
                  >
                    REWRITE
                  </span>
                </div>
                <div
                  style={{
                    padding: "18px",
                    fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
                    fontSize: "13px",
                    lineHeight: 1.75,
                    color: "#d4d4d4",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    minHeight: "200px",
                  }}
                >
                  {rewrite || ""}
                  {streaming && rewrite && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "2px",
                        height: "1.1em",
                        backgroundColor: "#44cc66",
                        verticalAlign: "middle",
                        marginLeft: "2px",
                        animation: "blink 1s step-start infinite",
                      }}
                    />
                  )}
                  {streaming && !rewrite && roast && (
                    <span style={{ color: "#555" }}>Coming up…</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{
                backgroundColor: "transparent",
                color: "#888",
                border: "1px solid #2a2a2a",
                borderRadius: "6px",
                padding: "11px 22px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#555";
                e.currentTarget.style.color = "#e8e8e8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#888";
              }}
            >
              Roast another
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "20px 24px",
          borderTop: "1px solid #1e1e1e",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
            fontSize: "11px",
            color: "#444",
            letterSpacing: "0.05em",
          }}
        >
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
      `}</style>
    </div>
  );
}
