import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import {
  X, Send, Trash2, Sparkles, HelpCircle, FileText,
  MessageSquare, Loader2
} from "lucide-react";

interface Props {
  onClose: () => void;
}

function getPageContext(location: string): Record<string, string> {
  if (location.startsWith("/team/")) {
    const teamId = location.split("/")[2];
    const tab = location.split("/")[3] || "overview";
    return { page: "team", teamId, tab };
  }
  if (location === "/") return { page: "dashboard" };
  if (location === "/settings") return { page: "settings" };
  if (location === "/admin") return { page: "admin" };
  return { page: "unknown" };
}

export default function AiAssistPanel({ onClose }: Props) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const location = useLocation();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: history, refetch } = trpc.ai.getHistory.useQuery({ limit: 50 });
  const saveMessage = trpc.ai.saveMessage.useMutation({ onSuccess: () => refetch() });
  const clearHistory = trpc.ai.clearHistory.useMutation({ onSuccess: () => refetch() });
  const chatMutation = trpc.kimi.chat.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const context = getPageContext(location.pathname);

  const buildSystemPrompt = (action?: string) => {
    let base = `You are RAOSS Hub AI, a professional technical assistant for the QR114i Salaam Stream project by RAOSS HK COMPANY LIMITED. `;
    base += `Respond in ${lang === "zh" ? "Chinese" : lang === "ar" ? "Arabic" : "English"}. `;
    if (context.page === "team" && context.teamId) {
      base += `User is viewing the ${context.teamId} team's ${context.tab} tab. `;
    } else if (context.page === "dashboard") {
      base += `User is on the project dashboard. `;
    }
    if (action === "summarize") base += `Summarize the following concisely. `;
    else if (action === "explain") base += `Explain in simple terms. `;
    return base;
  };

  const handleSend = async (overrideText?: string, action?: "summarize" | "explain" | "ask") => {
    const text = overrideText || input;
    if (!text.trim()) return;
    setIsLoading(true);
    saveMessage.mutate({ role: "user", content: text, context });
    try {
      const systemPrompt = buildSystemPrompt(action || "ask");
      const res = await chatMutation.mutateAsync({
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: text },
        ],
      });
      saveMessage.mutate({
        role: "assistant",
        content: res.content,
        context,
        tokensUsed: res.content.length,
      });
    } catch {
      saveMessage.mutate({
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        context,
      });
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI Hub Assist</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => clearHistory.mutate()} className="p-1.5 rounded hover:opacity-70" style={{ color: "var(--text-muted)" }} title="Clear">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => handleSend("Summarize this page", "summarize")} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded disabled:opacity-50" style={{ background: "rgba(88,166,255,0.1)", color: "var(--blue)" }}>
          <FileText size={10} /> {t("ai.summarize", "Summarize")}
        </button>
        <button onClick={() => handleSend("Explain this page", "explain")} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded disabled:opacity-50" style={{ background: "rgba(188,140,255,0.1)", color: "var(--purple)" }}>
          <HelpCircle size={10} /> {t("ai.explain", "Explain")}
        </button>
        <button onClick={() => handleSend("What can you help with?", "ask")} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded disabled:opacity-50" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>
          <MessageSquare size={10} /> {t("ai.ask", "Ask")}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {(!history || history.length === 0) && (
          <div className="text-center py-12">
            <Sparkles size={28} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("ai.welcome", "How can I help?")}</p>
            <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
              {context.page}{context.teamId ? ` / ${context.teamId}` : ""}
            </p>
          </div>
        )}
        {history?.map((msg: any) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-[9px] font-bold" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>AI</div>
            )}
            <div className={`max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
              <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>{msg.role === "assistant" ? "AI" : (user?.name || "You")}</div>
              <div className="inline-block px-3 py-2 rounded-lg text-xs leading-relaxed" style={{ background: msg.role === "assistant" ? "var(--bg-base)" : "var(--accent-dim)", color: "var(--text-primary)", border: `1px solid ${msg.role === "assistant" ? "var(--border-subtle)" : "transparent"}` }}>
                {msg.content}
              </div>
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-[9px] font-bold" style={{ background: "var(--bg-hover)", color: "var(--text-primary)" }}>{(user?.name || "U")[0].toUpperCase()}</div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>AI</div>
            <div className="px-3 py-2 rounded-lg" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder={t("ai.placeholder", "Ask AI...")} className="hub-input text-xs flex-1" disabled={isLoading} />
          <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="hub-btn text-xs px-3 disabled:opacity-50"><Send size={12} /></button>
        </div>
        <div className="text-[9px] mt-1.5 text-center" style={{ color: "var(--text-muted)" }}>
          {context.page}{context.teamId ? ` / ${context.teamId}` : ""}{context.tab ? ` / ${context.tab}` : ""}
        </div>
      </div>
    </div>
  );
}
