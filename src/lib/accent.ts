/**
 * Coloured words in admin-editable headings: "Willkommen an der {lila:LAN}." renders "LAN" in purple.
 * Unknown colours and unbalanced braces stay plain text; the result is only ever rendered as text nodes.
 */
export const ACCENTS = [
  { key: 'lila', label: 'Lila', color: 'var(--purple)' },
  { key: 'blau', label: 'Blau', color: 'var(--blue)' },
  { key: 'gruen', label: 'Grün', color: 'var(--green)' },
  { key: 'orange', label: 'Orange', color: 'var(--orange)' },
  { key: 'rot', label: 'Rot', color: 'var(--red)' },
] as const;

export type AccentColor = (typeof ACCENTS)[number]['key'];

export interface AccentSegment {
  text: string;
  color: AccentColor | null;
}

const KEYS = new Set<string>(ACCENTS.map((a) => a.key));
const TOKEN = /\{([a-z]+):([^{}]+)\}/g;

export function parseAccent(input: string | null | undefined): AccentSegment[] {
  if (!input) return [];
  const out: AccentSegment[] = [];
  let last = 0;
  for (const m of input.matchAll(TOKEN)) {
    if (!KEYS.has(m[1])) continue;
    if (m.index > last) out.push({ text: input.slice(last, m.index), color: null });
    out.push({ text: m[2], color: m[1] as AccentColor });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last), color: null });
  return out;
}

/** Text without markup, e.g. for the document title or aria labels. */
export function stripAccent(input: string | null | undefined): string {
  return parseAccent(input)
    .map((s) => s.text)
    .join('');
}

/** Wraps value[start, end) in {color:…}; any markup inside the selection is removed first. */
export function applyAccent(value: string, start: number, end: number, color: AccentColor | null): string {
  if (start >= end) return value;
  const selected = stripAccent(value.slice(start, end));
  // Selection partly inside a token: widen it to whole tokens so the markup stays balanced.
  let from = start;
  let to = end;
  for (const m of value.matchAll(TOKEN)) {
    const a = m.index;
    const b = m.index + m[0].length;
    if (a < to && b > from) {
      from = Math.min(from, a);
      to = Math.max(to, b);
    }
  }
  const inner = from === start && to === end ? selected : stripAccent(value.slice(from, to));
  return value.slice(0, from) + (color ? `{${color}:${inner}}` : inner) + value.slice(to);
}
