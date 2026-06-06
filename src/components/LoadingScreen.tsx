export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "var(--bg-base, #0d1117)" }}
    >
      <div className="text-center">
        <div
          className="text-2xl font-bold tracking-wider mb-4"
          style={{ color: "var(--text-primary, #e6edf3)" }}
        >
          RAOSS<span style={{ color: "var(--accent, #58a6ff)" }}>HUB</span>
        </div>
        <div
          className="w-48 h-1 rounded-full overflow-hidden mx-auto"
          style={{ background: "var(--border, #30363d)" }}
        >
          <div
            className="h-full rounded-full animate-pulse"
            style={{
              background: "var(--accent, #58a6ff)",
              width: "60%",
              animation: "loadingBar 1.5s ease-in-out infinite",
            }}
          />
        </div>
        <p
          className="text-xs mt-3"
          style={{ color: "var(--text-muted, #8b949e)" }}
        >
          Initialising&hellip;
        </p>
      </div>
      <style>{`
        @keyframes loadingBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
