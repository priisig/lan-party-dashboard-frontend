import { useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../api/client';
import type { LayoutRequest, MarkerAlign, MarkerKind, RoomMarker, RoomSide, SeatMapView, SeatView } from '../api/types';
import { Icon } from '../components/Icon';
import { SeatLegend, SeatMap } from '../components/seatmap/SeatMap';
import { useAdmin } from './AdminContext';
import { AdminTopBar } from './AdminLayout';
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
    <div className="admin-main admin-seating">
      <AdminTopBar title="Saalplan-Editor" subtitle="Plätze zuweisen, sperren und das Layout des Raums festlegen">
        <div role="radiogroup" aria-label="Werkzeug" className="segmented admin-seating__tools">
          {TOOLS.map((t) => (
            <button key={t.key} role="radio" aria-checked={tool === t.key} className={'segmented__btn' + (tool === t.key ? ' is-on' : '')} onClick={() => setTool(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <a href="/sitzplan" target="_blank" rel="noreferrer" className="btn btn--outline btn--sm">
          Ansehen <Icon name="external" size={16} />
        </a>
      </AdminTopBar>
      <div className="admin-seating__main">
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
      </div>
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

const SIDES: { value: RoomSide; label: string }[] = [
  { value: 'TOP', label: 'Oben' },
  { value: 'RIGHT', label: 'Rechts' },
  { value: 'BOTTOM', label: 'Unten' },
  { value: 'LEFT', label: 'Links' },
];
const KINDS: { value: MarkerKind; label: string }[] = [
  { value: 'BEAMER', label: 'Beamer / Bühne' },
  { value: 'ENTRANCE', label: 'Eingang' },
  { value: 'OTHER', label: 'Sonstiges' },
];
const ALIGNS: { value: MarkerAlign; label: string }[] = [
  { value: 'START', label: 'Anfang' },
  { value: 'CENTER', label: 'Mitte' },
  { value: 'END', label: 'Ende' },
];

function nextRowLabel(labels: string[]): string {
  for (let c = 65; c <= 90; c++) {
    const l = String.fromCharCode(c);
    if (!labels.includes(l)) return l;
  }
  return 'X' + labels.length;
}

const EMPTY_LAYOUT: LayoutRequest = { orientation: 'ROWS', rowsReversed: false, numbersReversed: false, markers: [], rows: [] };

/** Turns the draft into a map so the editor can show a live preview before saving. */
function previewMap(draft: LayoutRequest, map: SeatMapView | undefined): SeatMapView {
  const existing = new Map((map?.rows ?? []).flatMap((r) => r.seats).map((s) => [s.label, s]));
  const rows = draft.rows.map((r, i) => ({
    id: r.id ?? -(i + 1),
    label: r.label,
    seats: Array.from({ length: Math.max(0, Math.min(100, r.seatCount || 0)) }, (_, n) => {
      const label = r.label + (n + 1);
      return existing.get(label) ?? { label, number: n + 1, status: 'FREE' as const, gamertag: null, pending: false, note: null };
    }),
  }));
  return { ...draft, rows, taken: 0, free: 0, blocked: 0, total: 0 };
}

function LayoutEditor() {
  const { event } = useAdmin();
  const api = useSeatsAdmin(event.id);
  const toast = useToast();
  const map = api.map.data;
  const source = useMemo<LayoutRequest | undefined>(
    () =>
      map && {
        orientation: map.orientation,
        rowsReversed: map.rowsReversed,
        numbersReversed: map.numbersReversed,
        markers: map.markers,
        rows: map.rows.map((r) => ({ id: r.id, label: r.label, seatCount: r.seats.length })),
      },
    [map],
  );
  const { draft, setDraft, dirty, reset } = useDraft<LayoutRequest>(source, EMPTY_LAYOUT);
  const set = <K extends keyof LayoutRequest>(key: K, value: LayoutRequest[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setRow = (i: number, patch: Partial<LayoutRequest['rows'][number]>) => set('rows', draft.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setMarker = (i: number, patch: Partial<RoomMarker>) => set('markers', draft.markers.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const vertical = draft.orientation === 'COLUMNS';
  const preview = useMemo(() => previewMap(draft, map), [draft, map]);

  const save = () => {
    const removed = (source?.rows ?? []).reduce((sum, r) => {
      const next = draft.rows.find((n) => n.id === r.id);
      return sum + Math.max(0, r.seatCount - (next?.seatCount ?? 0));
    }, 0);
    if (removed > 0 && !window.confirm(`${removed} Plätze fallen weg (inkl. Zuweisungen). Fortfahren?`)) return;
    if (draft.markers.some((m) => !m.label.trim())) {
      toast('Jede Markierung braucht eine Beschriftung.', 'error');
      return;
    }
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
      <div className="lbl">
        Ausrichtung der Reihen
        <div role="radiogroup" aria-label="Ausrichtung" className="segmented">
          {(['ROWS', 'COLUMNS'] as const).map((o) => (
            <button key={o} type="button" role="radio" aria-checked={draft.orientation === o} className={'segmented__btn' + (draft.orientation === o ? ' is-on' : '')} onClick={() => set('orientation', o)}>
              {o === 'ROWS' ? 'Waagrecht' : 'Senkrecht'}
            </button>
          ))}
        </div>
      </div>
      <div className="form-grid">
        <div className="lbl">
          Reihe {draft.rows[0]?.label ?? 'A'} ist
          <div role="radiogroup" aria-label="Reihenfolge" className="segmented">
            {[false, true].map((rev) => (
              <button key={String(rev)} type="button" role="radio" aria-checked={draft.rowsReversed === rev} className={'segmented__btn' + (draft.rowsReversed === rev ? ' is-on' : '')} onClick={() => set('rowsReversed', rev)}>
                {vertical ? (rev ? 'rechts' : 'links') : rev ? 'unten' : 'oben'}
              </button>
            ))}
          </div>
        </div>
        <div className="lbl">
          Platz 1 ist
          <div role="radiogroup" aria-label="Platznummerierung" className="segmented">
            {[false, true].map((rev) => (
              <button key={String(rev)} type="button" role="radio" aria-checked={draft.numbersReversed === rev} className={'segmented__btn' + (draft.numbersReversed === rev ? ' is-on' : '')} onClick={() => set('numbersReversed', rev)}>
                {vertical ? (rev ? 'unten' : 'oben') : rev ? 'rechts' : 'links'}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      <div className="stack-sm">
        <h3 className="h h--sm">Markierungen im Raum</h3>
        <p className="small muted no-margin">Beamer, Eingang, Theke … unabhängig von der Ausrichtung an einer beliebigen Seite platzieren.</p>
        {draft.markers.map((m, i) => (
          <div key={i} className="marker-row">
            <input className="in" aria-label="Beschriftung" maxLength={60} value={m.label} onChange={(e) => setMarker(i, { label: e.target.value })} placeholder="Beschriftung" />
            <select className="in" aria-label="Art" value={m.kind} onChange={(e) => setMarker(i, { kind: e.target.value as MarkerKind })}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <select className="in" aria-label="Seite" value={m.side} onChange={(e) => setMarker(i, { side: e.target.value as RoomSide })}>
              {SIDES.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <select className="in" aria-label="Position" value={m.align} onChange={(e) => setMarker(i, { align: e.target.value as MarkerAlign })} disabled={m.kind === 'BEAMER'}>
              {ALIGNS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <RemoveButton label={`Markierung ${m.label} entfernen`} onClick={() => set('markers', draft.markers.filter((_, j) => j !== i))} />
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost btn--sm align-start"
          disabled={draft.markers.length >= 20}
          onClick={() =>
            set('markers', [
              ...draft.markers,
              draft.markers.some((m) => m.kind === 'BEAMER')
                ? { kind: 'OTHER', label: '', side: 'BOTTOM', align: 'CENTER' }
                : { kind: 'BEAMER', label: 'Bühne · Beamer', side: 'TOP', align: 'CENTER' },
            ])
          }
        >
          + Markierung
        </button>
      </div>

      {dirty && (
        <div className="layout-preview" aria-label="Vorschau">
          <span className="h h--sm">Vorschau</span>
          <SeatMap map={preview} compact />
        </div>
      )}

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
