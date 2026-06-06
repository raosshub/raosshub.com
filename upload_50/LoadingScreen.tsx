import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [step, setStep] = useState(0);
  const [text, setText] = useState("Initialising");
  const steps = [
    "Initialising",
    "Loading configuration",
    "Loading language files",
    "Checking credentials",
    "Ready",
  ];
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(steps[i] || "Ready");
      setStep(i);
      i++;
      if (i >= steps.length) clearInterval(interval);
    }, 350);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(((step + 1) / (steps.length - 1)) * 100, 100);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base, #0d1117)",
        zIndex: 9999,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 32,
            color: "var(--text-primary, #e6edf3)",
            letterSpacing: -1,
          }}
        >
          RAOSS<span style={{ color: "var(--accent, #3fb950)" }}>HUB</span>
        </div>

        <div
          style={{
            width: 180,
            height: 3,
            background: "var(--border, #30363d)",
            borderRadius: 4,
            margin: "0 auto 12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--accent, #3fb950)",
              borderRadius: 4,
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>

        <p
          style={{
            fontSize: 11,
            color: "var(--text-muted, #484f58)",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
