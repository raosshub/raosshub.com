import { useState } from "react";
import { Shield, X, Loader2 } from "lucide-react";

interface NdaModalProps {
  onAccepted: () => void;
  onDeclined: () => void;
  isAccepting?: boolean;
}

export default function NdaModal({ onAccepted, onDeclined, isAccepting = false }: NdaModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-elevated, #161b22)",
          border: "1px solid var(--border, #30363d)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Shield size={18} style={{ color: "var(--accent)" }} />
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Non-Disclosure Agreement
              </h2>
              <p
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                Confidentiality &amp; Access Terms
              </p>
            </div>
          </div>
          <div
            className="text-[10px] font-bold px-2 py-1 rounded"
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
          >
            NDA
          </div>
        </div>

        {/* Body */}
        <div
          className="px-5 py-4 text-xs leading-relaxed max-h-[300px] overflow-y-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          <p className="mb-3">
            This Non-Disclosure Agreement ("NDA") governs your access to
            confidential project information within RAOSS Hub.
          </p>
          <h4
            className="text-[11px] font-semibold mb-1 mt-3"
            style={{ color: "var(--text-primary)" }}
          >
            1. Confidential Information
          </h4>
          <p className="mb-2">
            All project data, technical specifications, timelines, and team
            communications are considered confidential.
          </p>
          <h4
            className="text-[11px] font-semibold mb-1 mt-3"
            style={{ color: "var(--text-primary)" }}
          >
            2. Obligations
          </h4>
          <p className="mb-2">
            You agree not to disclose, share, or distribute any confidential
            information to third parties without prior written consent.
          </p>
          <h4
            className="text-[11px] font-semibold mb-1 mt-3"
            style={{ color: "var(--text-primary)" }}
          >
            3. Consequences
          </h4>
          <p>
            Violation of this agreement may result in immediate termination of
            access and potential legal action.
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <label className="flex items-center gap-2 text-xs cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="rounded"
            />
            <span style={{ color: "var(--text-secondary)" }}>
              I have read and agree to the Non-Disclosure Agreement.
            </span>
          </label>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onDeclined}
              className="px-4 py-2 text-xs rounded-md font-medium"
              style={{
                background: "var(--bg-base)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Decline &amp; Exit
            </button>
            <button
              onClick={onAccepted}
              disabled={!checked || isAccepting}
              className="px-4 py-2 text-xs rounded-md font-medium disabled:opacity-40 flex items-center gap-1.5"
              style={{
                background: "var(--accent, #238636)",
                color: "#fff",
              }}
            >
              {isAccepting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Saving…
                </>
              ) : (
                "I Agree"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
