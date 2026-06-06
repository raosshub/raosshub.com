import { useRef, useCallback } from "react";
import { Bold, List, ListOrdered } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Type here... Use ## for headings, - for bullets",
  rows = 16,
  disabled = false,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return { start: 0, end: 0, text: "" };
    return {
      start: ta.selectionStart,
      end: ta.selectionEnd,
      text: ta.value.substring(ta.selectionStart, ta.selectionEnd),
    };
  }, []);

  const insertAtCursor = useCallback(
    (before: string, after: string = "") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { start, end, text } = getSelection();
      const newValue =
        ta.value.substring(0, start) + before + text + after + ta.value.substring(end);
      onChange(newValue);
      // Restore focus and set cursor position after insertion
      setTimeout(() => {
        ta.focus();
        const cursorPos = start + before.length + text.length + after.length;
        ta.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    },
    [getSelection, onChange]
  );

  const toggleBold = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end, text } = getSelection();
    if (!text) {
      // No selection — insert placeholder
      insertAtCursor("**bold**");
      return;
    }
    // Check if already bold
    const val = ta.value;
    const before = val.substring(start - 2, start);
    const after = val.substring(end, end + 2);
    if (before === "**" && after === "**") {
      // Remove bold
      const newValue =
        val.substring(0, start - 2) + text + val.substring(end + 2);
      onChange(newValue);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start - 2, start - 2 + text.length);
      }, 0);
    } else {
      // Add bold
      const newValue = val.substring(0, start) + "**" + text + "**" + val.substring(end);
      onChange(newValue);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + 2, start + 2 + text.length);
      }, 0);
    }
  }, [getSelection, insertAtCursor, onChange]);

  const toggleBullets = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = getSelection();
    const val = ta.value;
    // Find the start of the current line
    let lineStart = val.lastIndexOf("\n", start - 1) + 1;
    if (lineStart < 0) lineStart = 0;
    // Find the end of the current line
    let lineEnd = val.indexOf("\n", start);
    if (lineEnd === -1) lineEnd = val.length;
    // Get the selected lines
    const selectedText = val.substring(lineStart, end > lineEnd ? end : lineEnd);
    const lines = selectedText.split("\n");
    // Check if all lines already have bullets
    const allBulleted = lines.every((l) => l.startsWith("- "));
    const newLines = lines.map((l) => {
      if (allBulleted) return l.replace(/^- /, "");
      if (l.match(/^\d+\.\s/)) return l.replace(/^\d+\.\s/, "- ");
      return "- " + l;
    });
    const newValue =
      val.substring(0, lineStart) + newLines.join("\n") + val.substring(lineEnd);
    onChange(newValue);
    setTimeout(() => {
      ta.focus();
      const newCursorPos =
        lineStart + newLines.slice(0, lines.length).join("\n").length;
      ta.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [getSelection, onChange]);

  const toggleNumbers = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = getSelection();
    const val = ta.value;
    let lineStart = val.lastIndexOf("\n", start - 1) + 1;
    if (lineStart < 0) lineStart = 0;
    let lineEnd = val.indexOf("\n", Math.max(start, end - 1));
    if (lineEnd === -1) lineEnd = val.length;
    const selectedText = val.substring(lineStart, end > lineEnd ? end : lineEnd);
    const lines = selectedText.split("\n");
    // Check if all lines already have numbers
    const allNumbered = lines.every((l) => l.match(/^\d+\.\s/));
    const newLines = lines.map((l, i) => {
      if (allNumbered) return l.replace(/^\d+\.\s/, "");
      if (l.startsWith("- ")) return l.replace(/^- /, `${i + 1}. `);
      return `${i + 1}. ` + l;
    });
    const newValue =
      val.substring(0, lineStart) + newLines.join("\n") + val.substring(lineEnd);
    onChange(newValue);
    setTimeout(() => {
      ta.focus();
      const newCursorPos =
        lineStart + newLines.slice(0, lines.length).join("\n").length;
      ta.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [getSelection, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key inserts indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const { start, end } = getSelection();
      const val = ta.value;
      if (start === end) {
        // No selection — insert 2 spaces
        const newValue = val.substring(0, start) + "  " + val.substring(end);
        onChange(newValue);
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg-base, #0d1117)",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-3 py-2 border-b"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated, #161b22)",
        }}
      >
        <button
          onClick={toggleBold}
          disabled={disabled}
          className="p-1.5 rounded transition-all hover:opacity-80 disabled:opacity-40"
          style={{
            color: "var(--text-secondary)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-dim, rgba(63,185,80,0.15))";
            e.currentTarget.style.color = "var(--accent-text, #3fb950)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} strokeWidth={2.5} />
        </button>
        <button
          onClick={toggleBullets}
          disabled={disabled}
          className="p-1.5 rounded transition-all hover:opacity-80 disabled:opacity-40"
          style={{
            color: "var(--text-secondary)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-dim, rgba(63,185,80,0.15))";
            e.currentTarget.style.color = "var(--accent-text, #3fb950)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          onClick={toggleNumbers}
          disabled={disabled}
          className="p-1.5 rounded transition-all hover:opacity-80 disabled:opacity-40"
          style={{
            color: "var(--text-secondary)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-dim, rgba(63,185,80,0.15))";
            e.currentTarget.style.color = "var(--accent-text, #3fb950)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
        <div
          className="w-px h-4 mx-1"
          style={{ background: "var(--border-subtle)" }}
        />
        <span
          className="text-[10px]"
          style={{ color: "var(--text-muted)" }}
        >
          ## Heading  - bullet  **bold**
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="w-full p-3 text-xs leading-relaxed resize-y font-mono focus:outline-none"
        style={{
          background: "transparent",
          color: "var(--text-primary, #e6edf3)",
          minHeight: `${rows * 1.5}rem`,
        }}
      />
    </div>
  );
}
