import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../api/client';
import type { BeamerSide, LayoutRequest, SeatView } from '../api/types';
import { Icon } from '../components/Icon';
import { SeatLegend, SeatMap } from '../components/seatmap/SeatMap';
import { useAdmin } from './AdminContext';
import { useSeatsAdmin } from './adminApi';
import { useToast } from './Toast';
import { RemoveButton } from './sections/common';
import { useDraft } from './useDraft';

type Tool = 'assign' | 'block' | 'release';
const TOOLS: { key: Tool; label: string }[] = [
  { key: 'assign', label: 'Zuweisen' },
  { key: 'block', label: 'Sperren' },
  { key: 'release', label: 'Freigeben' },
];

export function AdminSeatingPage() {
  const { event } = useAdmin();
  const api = useSeatsAdmin(event.id);
  const toast = useToast();
  const [tool, setTool] = useState<Tool>('assign');
  const [selected, setSelected] = useState<string | null>(null);
  const map = api.map.data;
  const seat = map?.rows.flatMap((r) => r.seats).find((s) => s.label === selected) ?? null;
  const fail = (e: unknown) => toast(errorMessage(e), 'error');

  const onSeat = (s: SeatView) => {
    if (tool === 'assign') setSelected(s.label);
    else if (tool === 'block') api.block.mutate(s.label, { onError: fail });
    else api.release.mutate(s.label, { onError: fail });
  };

  return (
    <div className="admin-seating">
      <header className="admin-seating__bar">
        <Link to="/admin" className="btn btn--ghost btn--sm">
          ← Verwaltung
        </Link>
        <h1 className="admin-seating__title">Sitzordnung</h1>
        <span className="admin-badge">ADMIN</span>
        <div role="radiogroup" aria-label="Werkzeug" className="segmented admin-seating__tools">
          {TOOLS.map((t) => (
            <button key={t.key} role="radio" aria-checked={tool === t.key} className={'segmented__btn' + (tool === t.key ? ' is-on' : '')} onClick={() => setTool(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <a href="/sitzplan" target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm admin-seating__view">
          Ansehen <Icon name="external" size={16} />
        </a>
      </header>
      <main className="page admin-seating__main">
        <section className="card" aria-label="Saalplan">
          <div className="card-head">
            <span className="small muted">
              {tool === 'assign' ? 'Platz anklicken, dann Gamertag eintragen.' : tool === 'block' ? 'Angeklickte Plätze werden gesperrt (Orga).' : 'Angeklickte Plätze werden freigegeben.'}
            </span>
            <SeatLegend />
          </div>
          {map && <SeatMap map={map} selected={selected} onSelect={onSeat} admin />}
        </section>
        <aside className="admin-seating__side">
          <SelectedSeat seat={seat} />
          <PendingRequests />
          <LayoutEditor />
        </aside>
      </main>
    </div>
  );
}

function SelectedSeat({ seat }: { seat: SeatView | null }) {
  const { event } = useAdmin();
  const api = useSeatsAdmin(event.id);
  const toast = useToast();
  const [gamertag, setGamertag] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setGamertag(seat?.gamertag ?? '');
    setNote(seat?.note ?? '');
  }, [seat?.label, seat?.gamertag, seat?.note]);

  if (!seat) {
    return (
      <section className="card card--accent">
        <h2 className="h">Ausgewählter Platz</h2>
        <p className="muted no-margin">Werkzeug «Zuweisen» wählen und einen Platz anklicken.</p>
      </section>
    );
  }
  const fail = (e: unknown) => toast(errorMessage(e), 'error');
  return (
    <section className="card card--accent">
      <h2 className="h">Ausgewählter Platz</h2>
      <span className="display admin-seating__label">{seat.label}</span>
      <label className="lbl">
        Gamertag zuweisen
        <input className="in" value={gamertag} onChange={(e) => setGamertag(e.target.value)} placeholder="Gamertag" disabled={seat.status === 'BLOCKED'} />
      </label>
      <label className="lbl">
        Notiz (intern)
        <input className="in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. braucht 2 Steckdosen" />
      </label>
      <div className="form-grid">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => api.assign.mutate({ label: seat.label, gamertag, note }, { onSuccess: () => toast(`Platz ${seat.label} gespeichert`), onError: fail })}
        >
          Speichern
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => api.release.mutate(seat.label, { onError: fail })}>
          Freigeben
        </button>
      </div>
      {seat.status !== 'BLOCKED' && (
        <button type="button" className="btn btn--ghost" onClick={() => api.block.mutate(seat.label, { onError: fail })}>
          Als Orga-Platz sperren
        </button>
      )}
    </section>
  );
}

function PendingRequests() {
  const { event } = useAdmin();
  const api = useSeatsAdmin(event.id);
  const toast = useToast();
  const list = api.pending.data ?? [];
  return (
    <section className="card">
      <h2 className="h">Offene Reservationen {list.length > 0 && <span className="chip chip--warn">{list.length}</span>}</h2>
      {list.length === 0 && <p className="empty no-margin">Keine offenen Anfragen.</p>}
      {list.map((p) => (
        <div key={p.id} className="pending">
          <span className="pending__who">
            <strong>{p.gamertag}</strong> <span className="mono muted">→ {p.seat}</span>
            {p.companions && <span className="small muted pending__with">mit {p.companions}</span>}
          </span>
          <button type="button" className="btn btn--ok btn--sm" onClick={() => api.approve.mutate(p.id, { onError: (e) => toast(errorMessage(e), 'error') })}>
            OK
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => api.reject.mutate(p.id)}>
            Ablehnen
          </button>
        </div>
      ))}
    </section>
  );
}

const SIDES: { value: BeamerSide; label: string }[] = [
  { value: 'LEFT', label: 'Links' },
  { value: 'RIGHT', label: 'Rechts' },
  { value: 'TOP', label: 'Oben' },
  { value: 'BOTTOM', label: 'Unten' },
];

function nextRowLabel(labels: string[]): string {
  for (let c = 65; c <= 90; c++) {
    const l = String.fromCharCode(c);
    if (!labels.includes(l)) return l;
  }
  return 'X' + labels.length;
}

function LayoutEditor() {
  const { event } = useAdmin();
  const api = useSeatsAdmin(event.id);
  const toast = useToast();
  const map = api.map.data;
  const source = useMemo<LayoutRequest | undefined>(
    () =>
      map && {
        beamerSide: map.beamerSide,
        labelStart: map.labelStart,
        labelEnd: map.labelEnd,
        rows: map.rows.map((r) => ({ id: r.id, label: r.label, seatCount: r.seats.length })),
      },
    [map],
  );
  const { draft, setDraft, dirty, reset } = useDraft<LayoutRequest>(source, { beamerSide: 'LEFT', labelStart: null, labelEnd: null, rows: [] });
  const set = <K extends keyof LayoutRequest>(key: K, value: LayoutRequest[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setRow = (i: number, patch: Partial<LayoutRequest['rows'][number]>) => set('rows', draft.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const vertical = draft.beamerSide === 'LEFT' || draft.beamerSide === 'RIGHT';

  const save = () => {
    const removed = (source?.rows ?? []).reduce((sum, r) => {
      const next = draft.rows.find((n) => n.id === r.id);
      return sum + Math.max(0, r.seatCount - (next?.seatCount ?? 0));
    }, 0);
    if (removed > 0 && !window.confirm(`${removed} Plätze fallen weg (inkl. Zuweisungen). Fortfahren?`)) return;
    api.layout.mutate(draft, {
      onSuccess: () => {
        reset();
        toast('Layout gespeichert');
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    });
  };

  return (
    <section className="card">
      <h2 className="h">Layout</h2>
      <label className="lbl">
        Beamer / Bühne
        <div role="radiogroup" className="segmented">
          {SIDES.map((s) => (
            <button key={s.value} type="button" role="radio" aria-checked={draft.beamerSide === s.value} className={'segmented__btn' + (draft.beamerSide === s.value ? ' is-on' : '')} onClick={() => set('beamerSide', s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </label>
      <p className="small muted no-margin">{vertical ? 'Reihen laufen senkrecht (90° gedreht), Platz 1 ist oben.' : 'Reihen laufen waagrecht, Platz 1 ist links.'} Reihe {draft.rows[0]?.label ?? 'A'} steht am nächsten zur Bühne.</p>
      <div className="stack-sm">
        <div className="layout-row layout-row--head small muted">
          <span>Reihe</span>
          <span>Plätze</span>
          <span />
        </div>
        {draft.rows.map((r, i) => (
          <div key={r.id ?? 'new' + i} className="layout-row">
            <input className="in mono" aria-label="Reihe" maxLength={10} value={r.label} onChange={(e) => setRow(i, { label: e.target.value.toUpperCase() })} />
            <input className="in mono" aria-label="Plätze" type="number" min={1} max={100} value={r.seatCount} onChange={(e) => setRow(i, { seatCount: Number(e.target.value) })} />
            <RemoveButton label={`Reihe ${r.label} entfernen`} onClick={() => set('rows', draft.rows.filter((_, j) => j !== i))} />
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost btn--sm align-start"
          onClick={() => set('rows', [...draft.rows, { id: null, label: nextRowLabel(draft.rows.map((r) => r.label)), seatCount: draft.rows[draft.rows.length - 1]?.seatCount ?? 10 }])}
        >
          + Reihe
        </button>
      </div>
      <div className="form-grid">
        <label className="lbl">
          {vertical ? 'Beschriftung oben' : 'Beschriftung links'}
          <input className="in" value={draft.labelStart ?? ''} onChange={(e) => set('labelStart', e.target.value)} placeholder="Eingang" />
        </label>
        <label className="lbl">
          {vertical ? 'Beschriftung unten' : 'Beschriftung rechts'}
          <input className="in" value={draft.labelEnd ?? ''} onChange={(e) => set('labelEnd', e.target.value)} placeholder="Theke" />
        </label>
      </div>
      <div className="row-actions">
        {dirty && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => reset()}>
            Verwerfen
          </button>
        )}
        <button type="button" className="btn btn--primary btn--sm push-right" disabled={!dirty || api.layout.isPending || draft.rows.length === 0} onClick={save}>
          Layout speichern
        </button>
      </div>
    </section>
  );
}
