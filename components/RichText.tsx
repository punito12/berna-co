import { Fragment } from "react";

// Renders the lightweight markdown produced by <RichTextEditor>:
//   **bold**, *italic*, and lines beginning with "- " as a bullet list.
// Everything else stays plain text with line breaks preserved. No HTML is
// interpreted, so this is safe to render from user input.
export default function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key} className="my-2 list-disc space-y-1 pl-5">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      return;
    }
    flushBullets(`ul-${i}`);
    if (line.trim() === "") {
      blocks.push(<br key={`br-${i}`} />);
    } else {
      blocks.push(<p key={`p-${i}`}>{renderInline(line)}</p>);
    }
  });
  flushBullets("ul-end");

  return <div className={className}>{blocks}</div>;
}

// Parse inline **bold** / *italic* within a single line.
function renderInline(text: string): React.ReactNode {
  // Split on **...** first, then *...* inside the remaining plain segments.
  const parts: React.ReactNode[] = [];
  const boldRe = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = boldRe.exec(text)) !== null) {
    if (m.index > last) parts.push(<Fragment key={key++}>{renderItalic(text.slice(last, m.index), () => key++)}</Fragment>);
    parts.push(<strong key={key++}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length)
    parts.push(<Fragment key={key++}>{renderItalic(text.slice(last), () => key++)}</Fragment>);
  return parts;
}

function renderItalic(text: string, nextKey: () => number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const italicRe = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = italicRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<em key={nextKey()}>{m[1]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
