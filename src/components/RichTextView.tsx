import React from "react";

interface RichTextViewProps {
  content: string;
  className?: string;
}

/**
 * Parse rich text into React elements.
 * Supports:
 *   ## Heading   → <h4> styled heading
 *   - bullet     → bullet point with dot
 *   **bold**     → bold text
 *   1. item      → numbered list
 *   ---          → horizontal rule
 *   plain text   → paragraph
 */
export default function RichTextView({ content, className = "" }: RichTextViewProps) {
  if (!content || !content.trim()) {
    return (
      <div
        className={`text-xs italic py-4 text-center ${className}`}
        style={{ color: "var(--text-muted)" }}
      >
        No content configured yet.
      </div>
    );
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line → spacing
    if (!trimmed) {
      elements.push(
        <div key={key++} className="h-2" />
      );
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(
        <hr
          key={key++}
          className="my-3"
          style={{ borderColor: "var(--border-subtle)", borderStyle: "solid", borderWidth: "1px 0 0" }}
        />
      );
      continue;
    }

    // Heading ## → <h4>
    if (trimmed.startsWith("## ")) {
      const headingText = parseInline(trimmed.slice(3), key);
      elements.push(
        <h4
          key={key++}
          className="text-xs font-bold mt-4 mb-2 pb-1"
          style={{
            color: "var(--accent, #58a6ff)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {headingText}
        </h4>
      );
      continue;
    }

    // Heading ### → <h5>
    if (trimmed.startsWith("### ")) {
      const headingText = parseInline(trimmed.slice(4), key);
      elements.push(
        <h5
          key={key++}
          className="text-[11px] font-semibold mt-3 mb-1.5"
          style={{ color: "var(--text-secondary, #8b949e)" }}
        >
          {headingText}
        </h5>
      );
      continue;
    }

    // Numbered list: "1. item"
    const numberedMatch = trimmed.match(/^(\d+)\.\s(.+)$/);
    if (numberedMatch) {
      const [, num, text] = numberedMatch;
      elements.push(
        <div key={key++} className="flex items-start gap-2 py-0.5">
          <span
            className="text-[10px] font-mono font-medium mt-0.5 flex-shrink-0 w-4 text-right"
            style={{ color: "var(--accent)" }}
          >
            {num}.
          </span>
          <span className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {parseInline(text, key)}
          </span>
        </div>
      );
      continue;
    }

    // Bullet: "- item" or "* item"
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bulletText = trimmed.slice(2);
      elements.push(
        <div key={key++} className="flex items-start gap-2 py-0.5">
          <span
            className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full"
            style={{ background: "var(--accent, #58a6ff)" }}
          />
          <span className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {parseInline(bulletText, key)}
          </span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={key++}
        className="text-xs leading-relaxed py-0.5"
        style={{ color: "var(--text-primary, #e6edf3)" }}
      >
        {parseInline(trimmed, key)}
      </p>
    );
  }

  return <div className={className}>{elements}</div>;
}

/**
 * Parse inline formatting: **bold**
 */
function parseInline(text: string, baseKey: number): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return (
        <strong
          key={`${baseKey}-b${i}`}
          className="font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {boldText}
        </strong>
      );
    }
    return <React.Fragment key={`${baseKey}-t${i}`}>{part}</React.Fragment>;
  });
}
