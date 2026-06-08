import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18nStore } from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { kimiApi } from '@/utils/api';
import { Icons } from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  taskType?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

// ─── Utility ──────────────────────────────────────────────────
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const STORAGE_KEY = 'hub_assist_sessions';

const loadSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

const DEFAULT_SYSTEM_PROMPT = `You are HUB Assist, an AI assistant for the RAOSS Hub project management system. You help with project planning, technical documentation, and team coordination. You have access to all team scopes, deliverables, and timelines. Be concise and professional.`;

const TEAMS = ['react', 'pcba', 'firmware', 'tft', 'router', 'charger', 'shell'];

// ─── Markdown renderer (lightweight) ──────────────────────────
const renderMarkdown = (text: string): string => {
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang || 'text';
      return `<pre style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin:8px 0;overflow-x:auto;"><div style="font-size:10px;color:#8b949e;margin-bottom:4px;font-family:'DM Mono',monospace;">${language}</div><code style="font-family:'DM Mono',monospace;font-size:13px;color:#e6edf3;line-height:1.6;white-space:pre;">${escapeHtml(code.trim())}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code style="background:rgba(110,118,129,0.25);padding:2px 6px;border-radius:4px;font-size:12px;font-family:\'DM Mono\',monospace;">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:var(--accent);margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:18px 0 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:700;color:var(--text-primary);margin:20px 0 12px;">$1</h1>')
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);padding-left:12px;margin:8px 0;color:var(--text-secondary);font-style:italic;">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;color:var(--text-secondary);">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:4px 0;color:var(--text-secondary);">$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);text-decoration:none;">$1</a>')
    .replace(/\n/g, '<br />');
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ─── Task type detector ───────────────────────────────────────
const detectTaskType = (lower: string): string => {
  if (lower.includes('scope') || lower.includes('scope of work') || lower.includes('sow')) return 'scope';
  if (lower.includes('deliverable')) return 'deliverables';
  if (lower.includes('milestone')) return 'milestones';
  if (lower.includes('action item') || lower.includes('add action') || lower.includes('add todo')) return 'actions';
  if (lower.includes('chat summary') || lower.includes('summarise') || lower.includes('meeting notes')) return 'chat_summary';
  if (lower.includes('insight') || lower.includes('extract insight')) return 'insight';
  if (lower.includes('risk') || lower.includes('risk assessment')) return 'risk';
  if (lower.includes('responsibility matrix') || lower.includes('team responsible')) return 'responsibility';
  if (lower.includes('review') || lower.includes('proofread') || lower.includes('diagnose')) return 'review';
  if (lower.includes('email') || lower.includes('notify') || lower.includes('follow up')) return 'communication';
  if (lower.includes('executive summary') || lower.includes('status update') || lower.includes('briefing')) return 'briefing';
  return 'chat';
};

// ─── Component ────────────────────────────────────────────────
const HubAssistPage: React.FC = () => {
  const { t, currentLang } = useI18nStore();
  const { addToast } = useNotificationStore();
  const { user } = useAuthStore();

  const [sessions, setSessions]             = useState<ChatSession[]>(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [inputText, setInputText]           = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [sidebarView, setSidebarView]       = useState<'sessions' | 'actions'>('sessions');
  const [showHelpModal, setShowHelpModal]   = useState(false);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Persist sessions
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  // Auto-create first session
  useEffect(() => {
    if (sessions.length === 0) {
      const welcome: ChatSession = {
        id: generateId(),
        title: 'Default Session',
        messages: [{
          id: generateId(),
          role: 'assistant',
          content: currentLang === 'zh'
            ? `欢迎使用 **HUB Assist**！\n\n我是 RAOSS Hub 项目管理系统的 AI 助手，可帮助您处理：\n\n- **项目规划**与进度管理\n- **技术文档**与代码审查\n- **团队协调**与任务管理\n\n请输入消息开始对话。`
            : `Welcome to **HUB Assist**!\n\nI can help you with:\n\n- **Project planning** and scheduling\n- **Technical documentation** and code review\n- **Team coordination** and task management\n\nType a message to get started.`,
          timestamp: Date.now(),
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions([welcome]);
      setCurrentSessionId(welcome.id);
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, []);

  // ─── Send message (streaming) ──────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || isLoading || !currentSessionId) return;

    const taskType   = detectTaskType(messageText.toLowerCase());
    const userMsgId  = generateId();
    const assistMsgId = generateId();

    const userMessage: Message = {
      id:        userMsgId,
      role:      'user',
      content:   messageText,
      timestamp: Date.now(),
      taskType,
    };

    // Empty assistant bubble — filled progressively by the stream
    const assistantMessage: Message = {
      id:        assistMsgId,
      role:      'assistant',
      content:   '',
      timestamp: Date.now(),
      taskType,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              messages:  [...s.messages, userMessage, assistantMessage],
              updatedAt: Date.now(),
              title:     s.title === 'New Chat' || s.title === 'Default Session'
                           ? messageText.slice(0, 30)
                           : s.title,
            }
          : s
      )
    );

    setInputText('');
    setIsLoading(true);
    setStreamingMsgId(assistMsgId);

    try {
      const messages = [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        ...(currentSession?.messages.map((m) => ({ role: m.role, content: m.content })) ?? []),
        { role: 'user', content: messageText },
      ];

      const response = await kimiApi.stream({
        model:       'moonshot-v1-8k',
        messages,
        temperature: 0.7,
      });

      if (!response.ok) {
        throw new Error(
          currentLang === 'zh'
            ? `服务器错误 ${response.status}`
            : `Server error ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break outer;

          try {
            const chunk = JSON.parse(data);

            // Bilingual server error event
            if (chunk.error) {
              const msg = currentLang === 'zh'
                ? (chunk.message_zh ?? chunk.message_en)
                : (chunk.message_en ?? chunk.message_zh ?? chunk.error);
              throw new Error(msg);
            }

            const token = chunk.choices?.[0]?.delta?.content ?? '';
            if (token) {
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === currentSessionId
                    ? {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistMsgId
                            ? { ...m, content: m.content + token }
                            : m
                        ),
                      }
                    : s
                )
              );
            }
          } catch (parseErr: any) {
            // Only re-throw if this was a real server error (not a JSON parse blip)
            if (parseErr.message && !parseErr.message.includes('JSON')) {
              throw parseErr;
            }
          }
        }
      }

    } catch (err: any) {
      const errorMsg = err?.message ??
        (currentLang === 'zh' ? '连接错误，请重试' : 'Connection error. Please try again.');

      addToast(errorMsg, 'error');

      // Replace empty assistant bubble with error
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistMsgId
                    ? { ...m, content: `__KIMI_ERROR__: ${errorMsg}` }
                    : m
                ),
              }
            : s
        )
      );
    }

    setIsLoading(false);
    setStreamingMsgId(null);
  }, [inputText, isLoading, currentSessionId, currentSession, addToast, currentLang]);

  // ─── Session management ────────────────────────────────────
  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id:        generateId(),
      title:     currentLang === 'zh' ? '新会话' : 'New Chat',
      messages:  [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setSidebarView('sessions');
    textareaRef.current?.focus();
  }, [currentLang]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) setCurrentSessionId('');
  }, [currentSessionId]);

  const clearAllSessions = useCallback(() => {
    const confirmText = currentLang === 'zh'
      ? '删除所有会话？此操作不可撤销。'
      : 'Delete all sessions? This cannot be undone.';
    if (window.confirm(confirmText)) {
      setSessions([]);
      setCurrentSessionId('');
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentLang]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ─── Action buttons ────────────────────────────────────────
  const handleAction = (action: string) => {
    const prompts: Record<string, string> = {
      scope:         `Generate a detailed scope of work for each team module (${TEAMS.join(', ')}). Include technical requirements, deliverables, and dependencies.`,
      deliverables:  `List all deliverables for each team (${TEAMS.join(', ')}). Include status, priority, and acceptance criteria.`,
      milestones:    `Create a project milestone timeline covering all teams (${TEAMS.join(', ')}). Include dates, owners, and dependencies.`,
      actions:       `Generate action items for the project. Identify key tasks, owners, priorities and due dates for each team.`,
      risks:         `Analyse project risks across all teams (${TEAMS.join(', ')}). Include probability, impact, mitigation strategies.`,
    };
    if (prompts[action]) sendMessage(prompts[action]);
  };

  // ─── Render ────────────────────────────────────────────────
  const sidebarWidth = 240;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-h) - 48px)', gap: 0, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>

      {/* Sessions sidebar */}
      <div style={{ width: sidebarWidth, flexShrink: 0, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={createSession}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Icons.plus size={14} />
            {currentLang === 'zh' ? '新会话' : 'New Chat'}
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {(['sessions', 'actions'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSidebarView(view)}
              style={{ flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: sidebarView === view ? 700 : 400, color: sidebarView === view ? 'var(--text-primary)' : 'var(--text-muted)', background: 'none', border: 'none', borderBottom: sidebarView === view ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }}
            >
              {view === 'sessions'
                ? (currentLang === 'zh' ? '会话' : 'Sessions')
                : (currentLang === 'zh' ? '快捷' : 'Actions')}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {sidebarView === 'sessions' ? (
            sessions.length === 0
              ? <div style={{ padding: '16px 8px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{currentLang === 'zh' ? '暂无会话' : 'No sessions'}</div>
              : sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setCurrentSessionId(s.id)}
                    style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 2, cursor: 'pointer', background: s.id === currentSessionId ? 'var(--bg-active)' : 'transparent', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
                  >
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      style={{ flexShrink: 0, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 3, display: 'flex', alignItems: 'center' }}
                    >
                      <Icons.close size={12} />
                    </button>
                  </div>
                ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { key: 'scope',        labelEn: 'Generate Scope',         labelZh: '生成范围' },
                { key: 'deliverables', labelEn: 'List Deliverables',      labelZh: '列举交付物' },
                { key: 'milestones',   labelEn: 'Create Milestones',      labelZh: '创建里程碑' },
                { key: 'actions',      labelEn: 'Generate Action Items',  labelZh: '生成行动项' },
                { key: 'risks',        labelEn: 'Analyse Risks',          labelZh: '分析风险' },
              ].map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAction(a.key)}
                  disabled={isLoading}
                  style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-overlay)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', cursor: isLoading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: isLoading ? 0.5 : 1 }}
                >
                  {currentLang === 'zh' ? a.labelZh : a.labelEn}
                </button>
              ))}
            </div>
          )}
        </div>

        {sessions.length > 0 && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={clearAllSessions}
              style={{ width: '100%', padding: '6px', fontSize: 11, color: 'var(--red)', background: 'none', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: 0.8 }}
            >
              {currentLang === 'zh' ? '清空所有' : 'Clear All'}
            </button>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>HUB Assist</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {isLoading
                ? (currentLang === 'zh' ? 'HUB 助手正在输入…' : 'HUB Assist is typing...')
                : (currentLang === 'zh' ? '由 Moonshot AI 提供支持' : 'Powered by Moonshot AI')}
            </div>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title={currentLang === 'zh' ? '帮助' : 'Help'}
          >
            <Icons.info size={16} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!currentSession || currentSession.messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {currentLang === 'zh' ? '新会话已创建，请发送消息。' : 'New session created. Send a message to begin.'}
            </div>
          ) : (
            currentSession.messages.map((msg, index) => {
              const isUser      = msg.role === 'user';
              const isStreaming  = msg.id === streamingMsgId && isLoading;
              const isError     = msg.content.startsWith('__KIMI_ERROR__:');
              const displayContent = isError
                ? msg.content.replace('__KIMI_ERROR__: ', '')
                : msg.content;

              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 10 }}>
                  {!isUser && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isError ? 'var(--red-dim)' : 'var(--accent-dim)', color: isError ? 'var(--red)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <Icons.robot size={14} />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: isUser ? '10px 14px' : '12px 16px',
                      borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isUser ? 'var(--accent)' : isError ? 'var(--red-dim)' : 'var(--bg-elevated)',
                      border: isUser ? 'none' : `1px solid ${isError ? 'var(--red)' : 'var(--border)'}`,
                      color: isUser ? 'var(--text-inverse)' : isError ? 'var(--red)' : 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.65,
                      wordBreak: 'break-word',
                    }}
                  >
                    {isUser ? (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    ) : isStreaming && msg.content === '' ? (
                      // Waiting for first token — show thinking indicator
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                        <span style={{ animation: 'pulse 1s ease infinite', display: 'inline-block' }}>●</span>
                        <span style={{ animation: 'pulse 1s ease infinite 0.2s', display: 'inline-block' }}>●</span>
                        <span style={{ animation: 'pulse 1s ease infinite 0.4s', display: 'inline-block' }}>●</span>
                      </span>
                    ) : (
                      <>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: isError ? escapeHtml(displayContent) : renderMarkdown(displayContent),
                          }}
                        />
                        {isStreaming && (
                          // Blinking cursor while tokens are flowing
                          <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--accent)', marginLeft: 2, verticalAlign: 'middle', animation: 'pulse 0.8s ease infinite' }} />
                        )}
                      </>
                    )}
                  </div>
                  {isUser && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue-dim)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontSize: 11, fontWeight: 700 }}>
                      {user?.firstName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={currentLang === 'zh' ? '发送消息… (Enter 发送，Shift+Enter 换行)' : 'Send a message… (Enter to send, Shift+Enter for new line)'}
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 13,
                resize: 'none',
                maxHeight: 160,
                overflow: 'auto',
                lineHeight: 1.5,
                transition: 'border-color var(--transition)',
                outline: 'none',
                opacity: isLoading ? 0.6 : 1,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 160) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputText.trim()}
              style={{
                width: 38, height: 38,
                borderRadius: 'var(--radius-sm)',
                background: isLoading || !inputText.trim() ? 'var(--bg-hover)' : 'var(--accent)',
                border: 'none',
                color: isLoading || !inputText.trim() ? 'var(--text-muted)' : 'var(--text-inverse)',
                cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all var(--transition)',
              }}
            >
              <Icons.send size={16} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            {currentLang === 'zh' ? 'AI 回复仅供参考，重要决策请自行核实。' : 'AI responses are for reference only. Verify important decisions independently.'}
          </div>
        </div>
      </div>

      {/* Help modal */}
      {showHelpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowHelpModal(false)}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, maxWidth: 440, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {currentLang === 'zh' ? 'HUB Assist 使用说明' : 'HUB Assist Help'}
              </h2>
              <button onClick={() => setShowHelpModal(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Icons.close size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {currentLang === 'zh' ? '键盘快捷键' : 'Keyboard Shortcuts'}
              </h3>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li><strong>Enter</strong> — {currentLang === 'zh' ? '发送消息' : 'Send message'}</li>
                <li><strong>Shift + Enter</strong> — {currentLang === 'zh' ? '换行' : 'New line'}</li>
              </ul>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {currentLang === 'zh' ? '快捷命令' : 'Quick Commands'}
              </h3>
              <ul style={{ paddingLeft: 20 }}>
                {[
                  ['scope',         '生成工作范围', 'Generate scope of work'],
                  ['deliverables',  '列出交付物',   'List deliverables'],
                  ['milestones',    '创建里程碑',   'Create milestones'],
                  ['action items',  '生成行动项',   'Generate action items'],
                  ['risks',         '分析风险',     'Analyse project risks'],
                ].map(([cmd, zh, en]) => (
                  <li key={cmd}>
                    <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{cmd}</code>
                    {' — '}
                    {currentLang === 'zh' ? zh : en}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(HubAssistPage);
