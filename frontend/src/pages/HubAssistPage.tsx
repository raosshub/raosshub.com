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

// ─── Markdown Renderer (lightweight) ──────────────────────────
const renderMarkdown = (text: string): string => {
  let html = text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang || 'text';
      return `<pre style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin:8px 0;overflow-x:auto;"><div style="font-size:10px;color:#8b949e;margin-bottom:4px;font-family:'DM Mono',monospace;">${language}</div><code style="font-family:'DM Mono',monospace;font-size:13px;color:#e6edf3;line-height:1.6;white-space:pre;">${escapeHtml(code.trim())}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(110,118,129,0.25);padding:2px 6px;border-radius:4px;font-size:12px;font-family:\'DM Mono\',monospace;">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:var(--accent);margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:18px 0 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:700;color:var(--text-primary);margin:20px 0 12px;">$1</h1>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);padding-left:12px;margin:8px 0;color:var(--text-secondary);font-style:italic;">$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;color:var(--text-secondary);">$1</li>')
    // Ordered lists (basic)
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;color:var(--text-secondary);">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);text-decoration:none;">$1</a>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.length === 0) return match;
      return `<td style="border:1px solid var(--border);padding:6px 10px;font-size:13px;">${cells.join('</td><td style="border:1px solid var(--border);padding:6px 10px;font-size:13px;">')}</td>`;
    })
    // Line breaks
    .replace(/\n/g, '<br />');

  return html;
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ─── Components ───────────────────────────────────────────────

const HubAssistPage: React.FC = () => {
  const { t, currentLang } = useI18nStore();
  const { addToast } = useNotificationStore();
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<'sessions' | 'actions'>('sessions');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentChatRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  // ─── Scroll to bottom ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // ─── Save sessions ───────────────────────────────────────────
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // ─── Auto-create first session ───────────────────────────────
  useEffect(() => {
    if (sessions.length === 0) {
      const defaultSession: ChatSession = {
        id: generateId(),
        title: 'Default Session',
        messages: [
          {
            id: generateId(),
            role: 'assistant',
            content: `Welcome to **HUB Assist v1.0.0**!\n\nI\'m your AI assistant for the RAOSS Hub project management system. I can help you with:\n\n- **Project planning** and scheduling\n- **Technical documentation** and code review\n- **Team coordination** and task management\n- **Data analysis** and reporting\n\nType a message to get started.`,
            timestamp: Date.now(),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, []);

  // ─── Send message ────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    // Detect task type
    const lower = messageText.toLowerCase();
    let taskType = 'chat';
    if (lower.includes('scope') || lower.includes('add scope') || lower.includes('scope of work') || lower.includes('sow')) taskType = 'scope';
    else if (lower.includes('deliverable') || lower.includes('add deliverable')) taskType = 'deliverables';
    else if (lower.includes('milestone') || lower.includes('add milestone')) taskType = 'milestones';
    else if (lower.includes('action item') || lower.includes('add action') || lower.includes('add todo')) taskType = 'actions';
    else if (lower.includes('chat summary') || lower.includes('summarise') || lower.includes('summarise this') || lower.includes('summarise chat') || lower.includes('summarise the chat') || lower.includes('meeting notes') || lower.includes('meeting minutes')) taskType = 'chat_summary';
    else if (lower.includes('extract insight') || lower.includes('extract insights') || lower.includes('insight from')) taskType = 'insight';
    else if (lower.includes('risk') || lower.includes('identify risk') || lower.includes('what are the risk') || lower.includes('risk assessment') || lower.includes('risk analysis') || lower.includes('identify the risk')) taskType = 'risk';
    else if (lower.includes('team responsibility') || lower.includes('team responsibility matrix') || lower.includes('responsibility matrix') || lower.includes('team responsible')) taskType = 'responsibility';
    else if (lower.includes('sequence diagram') || lower.includes('flow diagram') || lower.includes('mermaid') || lower.includes('diagram')) taskType = 'diagram';
    else if (lower.includes('documentation') || lower.includes('create documentation') || lower.includes('create doc') || lower.includes('document') || lower.includes('create tech spec') || lower.includes('create technical documentation') || lower.includes('create technical spec') || lower.includes('create spec')) taskType = 'documentation';
    else if (lower.includes('test plan') || lower.includes('test case') || lower.includes('test scenario') || lower.includes('test strategy') || lower.includes('testing plan')) taskType = 'testing';
    else if (lower.includes('generate code') || lower.includes('write code') || lower.includes('code snippet') || lower.includes('create code')) taskType = 'code';
    else if (lower.includes('resource estimate') || lower.includes('estimate resource') || lower.includes('how many') || lower.includes('how much') || lower.includes('cost estimate')) taskType = 'resources';
    else if (lower.includes('meeting') || lower.includes('meeting agenda') || lower.includes('agenda') || lower.includes('schedule meeting') || lower.includes('meeting schedule')) taskType = 'meeting';
    else if (lower.includes('compare option') || lower.includes('option comparison') || lower.includes('trade-off') || lower.includes('tradeoff') || lower.includes('vs') || lower.includes('versus') || lower.includes('pros and cons')) taskType = 'options';
    else if (lower.includes('dependency') || lower.includes('interdependency') || lower.includes('depends on') || lower.includes('blocker') || lower.includes('blocking') || lower.includes('blocked by')) taskType = 'dependencies';
    else if (lower.includes('standard') || lower.includes('compliance') || lower.includes('regulation') || lower.includes('certification') || lower.includes('requirement')) taskType = 'standards';
    else if (lower.includes('generate locale') || lower.includes('translate content') || lower.includes('create locale') || lower.includes('localise') || lower.includes('localize') || lower.includes('generate translation') || lower.includes('translate to') || lower.includes('translation') || lower.includes('translate')) taskType = 'locale';
    else if (lower.includes('analyse') || lower.includes('analyse the') || lower.includes('analyse data') || lower.includes('analyse this') || lower.includes('analyse the data') || lower.includes('analyse the following') || lower.includes('analyse the data below')) taskType = 'analysis';
    else if (lower.includes('market research') || lower.includes('competitor') || lower.includes('market analysis') || lower.includes('competitive') || lower.includes('market')) taskType = 'market';
    else if (lower.includes('create template') || lower.includes('create email') || lower.includes('create document') || lower.includes('create report') || lower.includes('create proposal') || lower.includes('create a') || lower.includes('create the')) taskType = 'template';
    else if (lower.includes('review') || lower.includes('check') || lower.includes('verify') || lower.includes('validate') || lower.includes('inspect') || lower.includes('audit') || lower.includes('assess') || lower.includes('evaluate') || lower.includes('examine') || lower.includes('scrutinise') || lower.includes('appraise') || lower.includes('analyse') || lower.includes('screen') || lower.includes('vet') || lower.includes('go through') || lower.includes('look over') || lower.includes('double-check') || lower.includes('proofread') || lower.includes('diagnose') || lower.includes('troubleshoot')) taskType = 'review';
    else if (lower.includes('email') || lower.includes('message') || lower.includes('write to') || lower.includes('notify') || lower.includes('inform') || lower.includes('reach out') || lower.includes('follow-up') || lower.includes('follow up') || lower.includes('escalate') || lower.includes('alert') || lower.includes('remind') || lower.includes('announce') || lower.includes('broadcast') || lower.includes('report to') || lower.includes('update on') || lower.includes('check in') || lower.includes('touch base')) taskType = 'communication';
    else if (lower.includes('brief') || lower.includes('executive summary') || lower.includes('status update') || lower.includes('progress report') || lower.includes('one-pager') || lower.includes('one pager') || lower.includes('dashboard summary')) taskType = 'briefing';
    else if (lower.includes('structure the project') || lower.includes('define the team') || lower.includes('create workstream') || lower.includes('create work breakdown') || lower.includes('define module') || lower.includes('define phase') || lower.includes('define milestone') || lower.includes('define deliverable') || lower.includes('define task') || lower.includes('create phase') || lower.includes('create milestone') || lower.includes('create deliverable') || lower.includes('create task')) taskType = 'structure';

    userMessage.taskType = taskType;

    // Update session with user message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              messages: [...s.messages, userMessage],
              updatedAt: Date.now(),
              title: s.title === 'New Chat' ? messageText.slice(0, 30) : s.title,
            }
          : s
      )
    );

    setInputText('');
    setIsLoading(true);

    try {
      const messages = [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        ...currentSession?.messages.map((m) => ({ role: m.role, content: m.content })) || [],
        { role: 'user', content: messageText },
      ];

      const res = await kimiApi.chat({
        model: 'moonshot-v1-8k',
        messages,
        temperature: 0.7,
      });

      const assistantContent = res.data?.choices?.[0]?.message?.content || 'Sorry, I could not process that request.';

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        taskType,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, assistantMessage], updatedAt: Date.now() }
            : s
        )
      );
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Connection error';
      addToast(errorMsg, 'error');

      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `__KIMI_ERROR__: ${errorMsg}`,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, errorMessage], updatedAt: Date.now() }
            : s
        )
      );
    }

    setIsLoading(false);
  }, [inputText, isLoading, currentSessionId, currentSession, addToast]);

  // ─── Session management ──────────────────────────────────────
  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setSidebarView('sessions');
    textareaRef.current?.focus();
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId('');
    }
  }, [currentSessionId]);

  const clearAllSessions = useCallback(() => {
    if (window.confirm('Delete all sessions? This cannot be undone.')) {
      setSessions([]);
      setCurrentSessionId('');
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ─── Keyboard shortcuts ──────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ─── Action button handlers ──────────────────────────────────
  const handleAction = (action: string) => {
    const prompts: Record<string, string> = {
      scope: `Generate a detailed scope of work for each team module (${TEAMS.join(', ')}). Include technical requirements, deliverables, and dependencies.`,
      deliverables: `List all deliverables for each team (${TEAMS.join(', ')}). Include status, priority, and acceptance criteria.`,
      milestones: `Create a project milestone timeline covering all teams (${TEAMS.join(', ')}). Include dates, owners, and dependencies.`,
      actions: `Generate action items for the project. Assign owners, priorities, and due dates.`,
      testing: `Create a comprehensive test plan covering unit tests, integration tests, and acceptance criteria for all modules.`,
      risks: `Identify potential project risks for each team (${TEAMS.join(', ')}). Include mitigation strategies and impact assessment.`,
      documentation: `Create technical documentation structure for the project. Include API docs, user guides, and architecture diagrams.`,
      diagram: `Generate a Mermaid sequence diagram showing the interaction between all teams (${TEAMS.join(', ')}).`,
      translate: `Translate the following content to ${currentLang === 'en' ? 'Chinese' : 'English'}.`,
    };

    const prompt = prompts[action];
    if (prompt) {
      setInputText(prompt);
      textareaRef.current?.focus();
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('tool_hub_assist')}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            AI-powered project management assistant
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHelpModal(true)} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-overlay)',
            color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icons.info size={14} /> Help
          </button>
          <button onClick={createSession} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
            color: 'var(--text-inverse)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icons.plus size={14} /> New Session
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0, overflow: 'hidden' }}>
        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Messages */}
          <div
            ref={currentChatRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 4px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {(!currentSession || currentSession.messages.length === 0) ? (
              /* Empty state */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 28 }}>
                  <Icons.robot size={32} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    HUB Assist v1.0.0
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6 }}>
                    AI-powered project management assistant. Ask me about scopes, deliverables, milestones, action items, testing plans, or any project-related questions.
                  </div>
                </div>
                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 480, width: '100%' }}>
                  {[
                    { icon: 'target', label: 'Generate Scopes', action: 'scope' },
                    { icon: 'package', label: 'List Deliverables', action: 'deliverables' },
                    { icon: 'calendar', label: 'Create Milestones', action: 'milestones' },
                    { icon: 'zap', label: 'Action Items', action: 'actions' },
                  ].map((item) => (
                    <button
                      key={item.action}
                      onClick={() => handleAction(item.action)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left',
                        transition: 'all var(--transition)',
                      }}
                    >
                      {React.createElement(Icons[item.icon as keyof typeof Icons] || Icons.info, { size: 14 })}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages */
              currentSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 16px',
                    marginBottom: 4,
                    borderRadius: 'var(--radius-sm)',
                    background: msg.role === 'assistant' ? 'var(--bg-overlay)' : 'transparent',
                    borderLeft: msg.role === 'assistant' ? '3px solid var(--accent)' : '3px solid var(--blue)',
                    animation: 'fadeUp 0.15s ease',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: msg.role === 'assistant' ? 'var(--accent-dim)' : 'var(--blue-dim)',
                    color: msg.role === 'assistant' ? 'var(--accent)' : 'var(--blue)',
                  }}>
                    {msg.role === 'assistant' ? 'AI' : (user?.firstName?.[0] || 'U').toUpperCase()}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                      {msg.role === 'assistant' ? 'HUB Assist' : user?.firstName || 'You'}
                      {msg.taskType && msg.taskType !== 'chat' && (
                        <span style={{
                          marginLeft: 8,
                          padding: '1px 6px',
                          borderRadius: 99,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                        }}>
                          {msg.taskType}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--accent)' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid var(--accent-dim)',
                  borderTopColor: 'var(--accent)',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 12 }}>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            flexShrink: 0,
            padding: '10px 0 0',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: 8,
          }}>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '8px 12px',
            }}>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask HUB Assist anything... (Shift+Enter for new line)"
                rows={1}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  resize: 'none',
                  minHeight: 20,
                  maxHeight: 120,
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: inputText.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                  color: inputText.trim() ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all var(--transition)',
                }}
              >
                <Icons.send size={16} />
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
              Powered by Moonshot AI · Responses may require verification
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 240,
            flexShrink: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Sidebar tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setSidebarView('sessions')}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  fontSize: 11,
                  fontWeight: sidebarView === 'sessions' ? 700 : 500,
                  color: sidebarView === 'sessions' ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: sidebarView === 'sessions' ? 'var(--bg-overlay)' : 'transparent',
                  border: 'none',
                  borderBottom: sidebarView === 'sessions' ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                Sessions ({sessions.length})
              </button>
              <button
                onClick={() => setSidebarView('actions')}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  fontSize: 11,
                  fontWeight: sidebarView === 'actions' ? 700 : 500,
                  color: sidebarView === 'actions' ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: sidebarView === 'actions' ? 'var(--bg-overlay)' : 'transparent',
                  border: 'none',
                  borderBottom: sidebarView === 'actions' ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                Actions
              </button>
            </div>

            {/* Sessions list */}
            {sidebarView === 'sessions' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    style={{
                      padding: '8px 12px',
                      margin: '1px 6px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      background: currentSessionId === session.id ? 'var(--accent-dim)' : 'transparent',
                      color: currentSessionId === session.id ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all var(--transition)',
                    }}
                  >
                    <Icons.chat size={14} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.title}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, opacity: 0.5 }}
                    >
                      <Icons.trash size={12} />
                    </button>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    No sessions yet
                  </div>
                )}

                {/* Session controls */}
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-subtle)', marginTop: 8 }}>
                  <button
                    onClick={clearAllSessions}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--red-dim)',
                      color: 'var(--red)',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Delete All
                  </button>
                </div>
              </div>
            )}

            {/* Actions list */}
            {sidebarView === 'actions' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {[
                  { icon: 'target', label: 'Generate Scopes', action: 'scope' },
                  { icon: 'package', label: 'List Deliverables', action: 'deliverables' },
                  { icon: 'calendar', label: 'Create Milestones', action: 'milestones' },
                  { icon: 'zap', label: 'Action Items', action: 'actions' },
                  { icon: 'shield', label: 'Risk Assessment', action: 'risks' },
                  { icon: 'document', label: 'Documentation', action: 'documentation' },
                  { icon: 'code', label: 'Sequence Diagram', action: 'diagram' },
                  { icon: 'globe', label: 'Translate Content', action: 'translate' },
                ].map((item) => (
                  <button
                    key={item.action}
                    onClick={() => handleAction(item.action)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: 'calc(100% - 12px)',
                      padding: '8px 12px',
                      margin: '1px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition)',
                    }}
                  >
                    {React.createElement(Icons[item.icon as keyof typeof Icons] || Icons.info, { size: 14 })}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14,
            boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 520, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'modalIn 0.25s ease',
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                <Icons.sparkles size={16} style={{ marginRight: 8, display: 'inline' }} />
                HUB Assist Help
              </h2>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Icons.close size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Keyboard Shortcuts</h3>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li><strong>Enter</strong> — Send message</li>
                <li><strong>Shift + Enter</strong> — New line</li>
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Commands</h3>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li>Type <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>scope</code> to generate scope of work</li>
                <li>Type <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>deliverables</code> to list deliverables</li>
                <li>Type <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>milestones</code> to create milestones</li>
                <li>Type <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>action items</code> to generate actions</li>
                <li>Type <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>locale</code> to translate content</li>
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Tips</h3>
              <ul style={{ paddingLeft: 20 }}>
                <li>Be specific in your requests for better results</li>
                <li>AI responses may require verification</li>
                <li>Sessions are saved locally in your browser</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(HubAssistPage);
