import { errorMessage } from '../../api/client';
import type { QueryType, ServerDto } from '../../api/types';
import { useAdmin } from '../AdminContext';
import { useServersAdmin } from '../adminApi';
import { useToast } from '../Toast';
import { useDraft } from '../useDraft';
import { AddButton, DateTimeInput, MoveButtons, RemoveButton, SaveBar, Section, move } from './common';

const QUERY_TYPES: { value: QueryType; label: string }[] = [
  { value: 'SOURCE', label: 'Source (CS2, GMod …)' },
  { value: 'MINECRAFT', label: 'Minecraft' },
  { value: 'QUAKE3', label: 'Quake 3 (CoD4 …)' },
  { value: 'NONE', label: 'Keine Abfrage' },
];

const EMPTY: ServerDto = { name: '', shortCode: null, host: '', port: null, queryPort: null, queryType: 'SOURCE', connectUrl: null, visible: true, availableFrom: null };

export function ServersSection() {
  const { event } = useAdmin();
  const { query, save } = useServersAdmin(event.id);
  const { draft, setDraft, dirty, reset } = useDraft<ServerDto[]>(query.data, []);
  const toast = useToast();

  const update = (i: number, patch: Partial<ServerDto>) => setDraft((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const onSave = () =>
    save.mutate(draft, {
      onSuccess: (list) => {
        reset(list);
        toast('Server gespeichert');
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    });

  return (
    <Section id="server" title="Game Server" action={<AddButton label="Server" onClick={() => setDraft((l) => [...l, { ...EMPTY }])} />}>
      {draft.length === 0 && <p className="empty">Noch keine Server.</p>}
      {draft.map((s, i) => (
        <details key={s.id ?? 'new' + i} className="subcard" open={!s.id}>
          <summary className="subcard__summary">
            <span className="subcard__title">
              <span className={'dot dot--sm'} style={{ background: s.visible ? 'var(--green)' : 'var(--grey)' }} />
              {s.name || 'Neuer Server'}
            </span>
            <span className="mono small muted">
              {s.host}
              {s.port ? ':' + s.port : ''}
            </span>
          </summary>
          <div className="subcard__body">
            <div className="form-grid">
              <label className="lbl">
                Name
                <input className="in" value={s.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="CS2 · Turnier 5v5" />
              </label>
              <label className="lbl">
                Kürzel
                <input className="in mono" value={s.shortCode ?? ''} onChange={(e) => update(i, { shortCode: e.target.value })} placeholder="CS2-1" />
              </label>
              <label className="lbl">
                Host / IP
                <input className="in mono" value={s.host} onChange={(e) => update(i, { host: e.target.value })} placeholder="10.0.0.21" />
              </label>
              <label className="lbl">
                Port
                <input className="in mono" inputMode="numeric" value={s.port ?? ''} onChange={(e) => update(i, { port: num(e.target.value) })} placeholder="27015" />
              </label>
              <label className="lbl">
                Spieler-Abfrage
                <select className="in" value={s.queryType} onChange={(e) => update(i, { queryType: e.target.value as QueryType })}>
                  {QUERY_TYPES.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lbl">
                Query-Port (falls anders)
                <input className="in mono" inputMode="numeric" value={s.queryPort ?? ''} onChange={(e) => update(i, { queryPort: num(e.target.value) })} />
              </label>
            </div>
            <label className="lbl">
              Connect-Link (leer = automatisch, z. B. steam://connect/…)
              <input className="in mono" value={s.connectUrl ?? ''} onChange={(e) => update(i, { connectUrl: e.target.value })} />
            </label>
            <label className="lbl">
              Verfügbar ab (optional, zeigt «ab 22:00»)
              <DateTimeInput value={s.availableFrom} onChange={(v) => update(i, { availableFrom: v })} timeZone={event.timezone} />
            </label>
            <div className="subcard__head">
              <label className="check">
                <input type="checkbox" checked={s.visible} onChange={(e) => update(i, { visible: e.target.checked })} />
                Auf Dashboard sichtbar
              </label>
              <span className="row-actions">
                <MoveButtons
                  onUp={i > 0 ? () => setDraft((l) => move(l, i, -1)) : undefined}
                  onDown={i < draft.length - 1 ? () => setDraft((l) => move(l, i, 1)) : undefined}
                />
                <RemoveButton label="Server löschen" onClick={() => setDraft((l) => l.filter((_, j) => j !== i))} />
              </span>
            </div>
          </div>
        </details>
      ))}
      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onReset={() => reset()} />
    </Section>
  );
}
