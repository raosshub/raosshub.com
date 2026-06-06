import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { showToast } from "@/stores/toastStore";
import { MessageSquare, Send, Image, Sparkles, User } from "lucide-react";

interface Props {
  teamId: string;
}

export default function ChatPanel({ teamId }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch } = trpc.chat.list.useQuery({ teamId });
  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => { setMessage(""); refetch(); },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ teamId, content: message.trim() });
  };

  return (
    <div className="flex flex-col h-[480px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
        {messages && messages.length > 0 ? (
          [...messages].reverse().map((msg: any) => {
            const isMe = msg.sentBy === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: isMe ? "var(--accent-dim)" : "var(--bg-hover)",
                    color: isMe ? "var(--accent-text)" : "var(--text-secondary)",
                  }}
                >
                  {msg.senderName?.[0]?.toUpperCase() || <User size={12} />}
                </div>
                <div className={`max-w-[70%] ${isMe ? "text-right" : ""}`}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>
                    {msg.senderName || "Unknown"}
                  </div>
                  <div
                    className="inline-block px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: isMe ? "var(--accent-dim)" : "var(--bg-base)",
                      color: "var(--text-primary)",
                      border: `1px solid ${isMe ? "var(--accent-dim)" : "var(--border-subtle)"}`,
                    }}
                  >
                    {msg.content}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <MessageSquare size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("chat.placeholder", "Team Collaboration Chat")}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Start the conversation</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Summary Button */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => showToast("AI Summary coming in next update", "info")}
          className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
          style={{ background: "var(--purple-dim, rgba(188,140,255,0.1))", color: "var(--purple)" }}
        >
          <Sparkles size={10} /> Summarize with AI
        </button>
        <button
          onClick={() => showToast("WeChat sync coming in next update", "info")}
          className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
          style={{ background: "var(--green-dim, rgba(63,185,80,0.1))", color: "var(--accent)" }}
        >
          <Image size={10} /> WeChat Sync
        </button>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="hub-input text-xs flex-1"
        />
        <button
          onClick={handleSend}
          disabled={sendMutation.isPending || !message.trim()}
          className="hub-btn text-xs px-3 disabled:opacity-50"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}
