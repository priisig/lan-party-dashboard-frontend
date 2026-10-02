import type { ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { fromLocalInput, toLocalInput } from '../../lib/time';

export function Section({ id, title, action, children, wide }: { id: string; title: ReactNode; action?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section id={id} className={'card admin-section' + (wide ? ' admin-section--wide' : '')}>
      <div className="card-head">
        <h2 className="card-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Compact on/off switch with its state text, e.g. "Sichtbar". */
export function Switch({ checked, onChange, label, text }: { checked: boolean; onChange: (v: boolean) => void; label: string; text?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      {text}
      <span className="switch__track" />
    </button>
  );
}

/** Full-width switch row with title and description (seat rules etc.). */
export function SwitchRow({ checked, onChange, title, on, off }: { checked: boolean; onChange: (v: boolean) => void; title: string; on: string; off: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch-row" onClick={() => onChange(!checked)}>
      <span className="switch-row__text">
        <strong>{title}</strong>
        <span>{checked ? on : off}</span>
      </span>
      <span className="switch__track" />
    </button>
  );
}

export function SaveBar({ dirty, saving, onSave, onReset, error }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void; error?: string | null }) {
  return (
    <div className="savebar">
      {error && <div className="error-box">{error}</div>}
      <div className="savebar__row">
        <span className="small muted">{dirty ? 'Ungespeicherte Änderungen' : 'Alles gespeichert'}</span>
        <div className="savebar__buttons">
          {dirty && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onReset} disabled={saving}>
              Verwerfen
            </button>
          )}
          <button type="button" className="btn btn--primary btn--sm" onClick={onSave} disabled={!dirty || saving}>
            {saving ? 'Speichere …' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn--primary btn--sm" onClick={onClick}>
      <Icon name="plus" size={16} /> {label}
    </button>
  );
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="ico" aria-label={label} title={label} onClick={onClick}>
      <Icon name="close" size={16} />
    </button>
  );
}

export function MoveButtons({ onUp, onDown }: { onUp?: () => void; onDown?: () => void }) {
  return (
    <span className="move">
      <button type="button" className="ico move__btn" aria-label="Nach oben" disabled={!onUp} onClick={onUp}>
        <Icon name="up" size={14} />
      </button>
      <button type="button" className="ico move__btn" aria-label="Nach unten" disabled={!onDown} onClick={onDown}>
        <Icon name="down" size={14} />
      </button>
    </span>
  );
}

/** datetime-local input that reads/writes ISO instants interpreted in the event timezone. */
export function DateTimeInput({ value, onChange, timeZone, label, required }: { value: string | null; onChange: (iso: string | null) => void; timeZone: string; label?: string; required?: boolean }) {
  return (
    <input
      className="in mono"
      type="datetime-local"
      aria-label={label}
      required={required}
      value={toLocalInput(value, timeZone)}
      onChange={(e) => onChange(fromLocalInput(e.target.value, timeZone))}
    />
  );
}

export function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
