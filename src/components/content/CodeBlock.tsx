"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react";

/**
 * Renders `LessonBlock`'s `code` case. Replaces the old flat `<pre>` dump —
 * one dense grey wall of text with no orientation, and nothing shrinking a
 * 50-line schema down to something skimmable — with:
 *
 * - line numbers, so a reader can navigate/reference a specific line
 * - a decorative accent-only highlighter (keywords in `signal`, the one
 *   accent this product allows; strings/comments in the existing muted/
 *   subtle text tiers). It's a merged keyword list across whatever
 *   languages content actually authors (sql/java/js/redis/lua/cypher), not
 *   a real per-language grammar — good enough to break up the wall of text
 *   without pulling in a highlighter dependency or inventing new colors
 *   (status-* stays reserved for real simulated state, per globals.css).
 * - a subtle elevated→panel gradient wash instead of one flat fill, so the
 *   block reads as a lit surface rather than a hole in the page
 * - a copy button, since these are meant to be usable snippets
 * - a collapse for anything past `COLLAPSE_AT` lines, so a full DDL dump
 *   doesn't read as one intimidating scroll the moment the page loads
 */

const COLLAPSE_AT = 14;

// Merged, decorative keyword set — overlap between languages (e.g. "set",
// "delete", "class" show up in more than one bucket) is fine, a Set dedupes.
const KEYWORDS = new Set(
  `select from where insert into values update delete create table alter drop
   index primary key foreign references not null default unique auto_increment
   and or in as on join left right inner outer full group by order having limit
   distinct case when then else end enum exists between like is asc desc
   cascade constraint check
   class interface extends implements public private protected static final
   abstract void new return if for while do switch break continue
   try catch finally throw throws import package this super instanceof
   synchronized volatile transient enum
   const let var function async await export from of typeof yield
   null undefined true false
   match merge remove unwind with
   local function then do repeat until nil
   expire ttl get set hset hget lpush rpush zadd sadd incr decr del exists`
    .split(/\s+/)
    .filter(Boolean),
);

type TokenType = "comment" | "string" | "keyword" | "plain";
type Token = { type: TokenType; text: string };

const TOKEN_CLASS: Record<TokenType, string> = {
  comment: "italic text-text-subtle",
  string: "text-text-muted",
  keyword: "text-signal",
  plain: "text-text",
};

// Only the "interesting" spans are matched here — comments, quoted strings,
// and word-like identifiers (checked against KEYWORDS below). Everything
// else (whitespace, punctuation, numbers) falls through as plain filler.
const TOKEN_RE =
  /\/\*[\s\S]*?\*\/|(?:\/\/|--|#)[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_][A-Za-z0-9_]*/g;

function classify(text: string): TokenType {
  if (text.startsWith("/*") || text.startsWith("//") || text.startsWith("--") || text.startsWith("#")) {
    return "comment";
  }
  if (text[0] === '"' || text[0] === "'" || text[0] === "`") return "string";
  if (KEYWORDS.has(text.toLowerCase())) return "keyword";
  return "plain";
}

function tokenizeToLines(code: string): Token[][] {
  const lines: Token[][] = [[]];
  let lastIndex = 0;

  const pushText = (text: string, type: TokenType) => {
    const parts = text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type, text: part });
    });
  };

  for (const match of code.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) pushText(code.slice(lastIndex, index), "plain");
    pushText(match[0], classify(match[0]));
    lastIndex = index + match[0].length;
  }
  if (lastIndex < code.length) pushText(code.slice(lastIndex), "plain");

  return lines;
}

export function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => tokenizeToLines(code), [code]);
  const isLong = lines.length > COLLAPSE_AT;
  const visibleLines = isLong && !expanded ? lines.slice(0, COLLAPSE_AT) : lines;
  const gutterWidth = String(lines.length).length;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — the button just won't
      // confirm; nothing else useful to do about it here.
    }
  }

  return (
    <div className="overflow-hidden border border-border">
      <div className="flex items-center justify-between border-b border-border bg-bg-elevated px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-subtle">{language ?? "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-text-subtle transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div
        className="relative"
        style={{ backgroundImage: "linear-gradient(180deg, var(--color-bg-elevated), var(--color-bg-panel))" }}
      >
        <div className="flex">
          <div
            aria-hidden
            className="select-none border-r border-border py-4 pl-3 pr-2 text-right font-mono text-xs leading-relaxed text-text-subtle/60"
          >
            {visibleLines.map((_, i) => (
              <div key={i} style={{ minWidth: `${gutterWidth}ch` }}>
                {i + 1}
              </div>
            ))}
          </div>
          <pre className="flex-1 overflow-x-auto py-4 pl-3 pr-4 font-mono text-xs leading-relaxed">
            <code>
              {visibleLines.map((line, i) => (
                <div key={i} className="whitespace-pre">
                  {line.length === 0
                    ? " "
                    : line.map((tok, j) => (
                        <span key={j} className={TOKEN_CLASS[tok.type]}>
                          {tok.text}
                        </span>
                      ))}
                </div>
              ))}
            </code>
          </pre>
        </div>

        {isLong && !expanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ backgroundImage: "linear-gradient(180deg, transparent, var(--color-bg-panel))" }}
          />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-bg-elevated py-2 font-mono text-[11px] uppercase tracking-wider text-signal transition-colors duration-fast ease-standard hover:bg-bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {expanded ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
          {expanded ? "Collapse" : `Show ${lines.length - COLLAPSE_AT} more lines`}
        </button>
      )}
    </div>
  );
}
