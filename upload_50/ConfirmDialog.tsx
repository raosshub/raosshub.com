interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  const confirmColor = variant === "danger" ? "var(--red, #f85149)" : "var(--accent, #3fb950)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(3px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          margin: "0 16px",
          background: "var(--bg-elevated, #161b22)",
          border: "1px solid var(--border, #30363d)",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary, #e6edf3)", marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary, #8b949e)", marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: 7,
              border: "1px solid var(--border, #30363d)",
              background: "transparent",
              color: "var(--text-secondary, #8b949e)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: 7,
              border: "none",
              background: confirmColor,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
