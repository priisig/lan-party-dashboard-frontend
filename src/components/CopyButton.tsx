import { useState } from 'react';
import { Icon } from './Icon';

/** Copies a value to the clipboard and briefly confirms it. */
export function CopyButton({ value, label, text }: { value: string; label: string; text?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      // clipboard blocked (http, permissions) – nothing to do
    }
  };
  if (text) {
    return (
      <button type="button" className="btn btn--outline btn--sm" onClick={copy} aria-label={label}>
        {done ? 'Kopiert ✓' : text}
      </button>
    );
  }
  return (
    <button type="button" className="ico" onClick={copy} aria-label={label} title={done ? 'Kopiert' : label}>
      <Icon name={done ? 'check' : 'copy'} size={18} />
    </button>
  );
}
