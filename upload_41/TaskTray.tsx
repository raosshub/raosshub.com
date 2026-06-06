import { useTaskStore } from "@/stores/taskStore";
import { IconSvg } from "@/lib/icons";

export default function TaskTray() {
  const { tasks, visible, setVisible, removeTask } = useTaskStore();
  if (!visible || tasks.length === 0) return null;

  const running = tasks.filter((t) => t.status === "running").length;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 20,
        width: 320,
        background: "var(--bg-elevated, #161b22)",
        border: "1px solid var(--border, #30363d)",
        borderBottom: "none",
        borderRadius: "10px 10px 0 0",
        zIndex: 9999,
        fontSize: 12,
      }}
    >
      {/* Header */}
      <div
        onClick={() => setVisible(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border, #30363d)",
          cursor: "pointer",
          color: "var(--text-secondary, #8b949e)",
        }}
      >
        <IconSvg name="upload" size={14} />
        <span style={{ flex: 1 }}>
          {running > 0 ? `${running} processing` : ""}
          {done > 0 ? ` | ${done} completed` : ""}
          {tasks.length === 0 ? "No active uploads" : ""}
        </span>
        <span style={{ fontSize: 10 }}>Hide</span>
      </div>

      {/* Task list */}
      {tasks.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderBottom: "1px solid var(--border-subtle, #21262d)",
          }}
        >
          {t.status === "running" && (
            <span
              style={{
                width: 12,
                height: 12,
                border: "2px solid var(--border, #30363d)",
                borderTopColor: "var(--accent, #3fb950)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
          {t.status === "done" && (
            <span style={{ color: "var(--accent, #3fb950)", flexShrink: 0 }}>
              <IconSvg name="check" size={12} />
            </span>
          )}
          {t.status === "error" && (
            <span style={{ color: "var(--red, #f85149)", flexShrink: 0 }}>
              <IconSvg name="warning" size={12} />
            </span>
          )}
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color:
                t.status === "error"
                  ? "var(--red, #f85149)"
                  : "var(--text-primary, #e6edf3)",
            }}
          >
            {t.text}
          </span>
          {t.status !== "running" && (
            <button
              onClick={() => removeTask(t.id)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted, #484f58)",
                cursor: "pointer",
                padding: 0,
                fontSize: 14,
              }}
            >
              <IconSvg name="close" size={10} />
            </button>
          )}
          {t.status === "running" && (
            <div
              style={{
                width: 60,
                height: 3,
                background: "var(--border, #30363d)",
                borderRadius: 2,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: `${t.progress}%`,
                  height: "100%",
                  background: "var(--accent, #3fb950)",
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
          )}
        </div>
      ))}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
