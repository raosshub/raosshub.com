import { useState } from "react";
import { Sparkles } from "lucide-react";
import AiAssistPanel from "./AiAssistPanel";

export default function AiSidebar() {
  const [expanded, setExpanded] = useState(false);
  const width = expanded ? 380 : 48;

  return (
    <aside
      className="flex flex-col h-full border-l flex-shrink-0 transition-all duration-300 ease-in-out"
      style={{
        width,
        minWidth: width,
        background: "var(--bg-elevated, #161b22)",
        borderColor: "var(--border, #30363d)",
        overflow: "hidden",
      }}
    >
      {expanded ? (
        /* Expanded: show full AI panel */
        <div className="flex flex-col h-full w-[380px]">
          <AiAssistPanel onClose={() => setExpanded(false)} />
        </div>
      ) : (
        /* Collapsed: show icon button */
        <div className="flex flex-col items-center pt-4 gap-2 w-[48px]">
          <button
            onClick={() => setExpanded(true)}
            title="Open AI Hub Assist"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, var(--cyan, #56d3ba) 100%)",
              boxShadow: "0 2px 8px rgba(63,185,80,0.3)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Sparkles size={18} color="#fff" />
          </button>
          {/* Vertical text label */}
          <div
            className="text-[9px] font-medium tracking-widest uppercase mt-2"
            style={{
              color: "var(--accent)",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            AI
          </div>
        </div>
      )}
    </aside>
  );
}
