import { useId, useRef } from 'react';
import { AccentText } from '../components/AccentText';
import { ACCENTS, type AccentColor, applyAccent, parseAccent } from '../lib/accent';

/**
 * Text field for headings with coloured words: select text, click a colour swatch.
 * Stores {farbe:Wort} markup; the preview shows the result as on the website.
 */
export function AccentInput({
  label,
  value,
  onChange,
  multiline = false,
  rows = 2,
  placeholder,
  maxLength,
  body = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  /** Preview in body text instead of the heading font (announcements). */
  body?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const hasAccent = parseAccent(value).some((s) => s.color);

  const apply = (color: AccentColor | null) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) {
      // Nothing selected: removing colours clears all markup, colouring needs a selection.
      if (color === null) onChange(applyAccent(value, 0, value.length, null));
      el.focus();
      return;
    }
    onChange(applyAccent(value, start, end, color));
    el.focus();
  };

  const common = {
    id,
    ref,
    className: 'in',
    value,
    placeholder,
    maxLength,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };

  return (
    <div className="accent-input">
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      {multiline ? <textarea {...common} rows={rows} /> : <input {...common} />}
      <div className="accent-input__tools" role="toolbar" aria-label={`Farben für ${label}`}>
        <span className="admin-hint">Text markieren, dann Farbe wählen:</span>
        {ACCENTS.map((a) => (
          <button
            key={a.key}
            type="button"
            className="accent-input__swatch"
            style={{ background: a.color }}
            title={a.label}
            aria-label={`Markierten Text ${a.label} färben`}
            // keep the text selection in the field
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(a.key)}
          />
        ))}
        <button type="button" className="accent-input__clear" onMouseDown={(e) => e.preventDefault()} onClick={() => apply(null)}>
          Farbe entfernen
        </button>
      </div>
      {(hasAccent || value.includes('\n')) && value.trim() && (
        <div className={'accent-input__preview' + (body ? ' accent-input__preview--body' : '')} aria-label="Vorschau">
          <AccentText text={value} />
        </div>
      )}
    </div>
  );
}
