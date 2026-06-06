import { Sparkles } from "lucide-react";

interface Props {
  onClick: () => void;
}

export default function AiAssistButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      title="AI Hub Assist"
      className="fixed z-[901] transition-all hover:scale-105 active:scale-95"
      style={{
        bottom: 24,
        right: 24,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--accent) 0%, var(--cyan, #56d3ba) 100%)",
        boxShadow: "0 4px 16px rgba(63,185,80,0.3), 0 0 0 4px rgba(63,185,80,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        cursor: "pointer",
        animation: "pulse-glow 2s ease-in-out infinite",
      }}
    >
      <Sparkles size={22} color="#fff" />
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 4px 16px rgba(63,185,80,0.3), 0 0 0 4px rgba(63,185,80,0.1); }
          50% { box-shadow: 0 4px 24px rgba(63,185,80,0.5), 0 0 0 8px rgba(63,185,80,0.05); }
        }
      `}</style>
    </button>
  );
}
