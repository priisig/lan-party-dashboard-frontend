import { useState } from 'react';
import { errorMessage } from '../../api/client';
import type { AdminTournament, TournamentRequest } from '../../api/types';
import { formatDateTime } from '../../lib/time';
import { useAdmin } from '../AdminContext';
import { useServersAdmin, useSettings, useTournamentsAdmin } from '../adminApi';
import { useToast } from '../Toast';
import { AddButton, DateTimeInput, RemoveButton, Section } from './common';

const COLORS = ['#3D8BFF', '#9B5CFF', '#4FD1E8', '#22D37A', '#E8B33A', '#FF5A6A'];

function toRequest(t: AdminTournament): TournamentRequest {
  const { id: _id, snapshotAt: _s, registrations: _r, ...rest } = t;
  return rest;
}

const EMPTY: TournamentRequest = {
  name: '',
  color: '#9B5CFF',
  formatLabel: 'Single Elimination',
  maxParticipants: 16,
  teamSize: 1,
  registrationOpen: true,
  registrationClosesAt: null,
  startsAt: null,
  serverId: null,
  challongeSlug: null,
  rulesUrl: null,
  sort: 0,
};

export function TournamentsSection() {
  const { event } = useAdmin();
  const api = useTournamentsAdmin(event.id);
  const settings = useSettings().query.data;
  const [creating, setCreating] = useState(false);
  const list = api.query.data ?? [];

  return (
    <Section id="turniere" title="Turniere" action={!creating && <AddButton label="Turnier" onClick={() => setCreating(true)} />}>
      {settings && !settings.challongeConfigured && (
        <p className="small warn-text no-margin">Kein Challonge API-Key hinterlegt – Turnierbäume werden erst nach dem Eintragen unter «Integrationen» geladen.</p>
      )}
      {creating && <TournamentEditor initial={{ ...EMPTY, sort: list.length }} onDone={() => setCreating(false)} />}
      {list.length === 0 && !creating && <p className="empty">Noch keine Turniere.</p>}
      {list.map((t) => (
        <TournamentCard key={t.id} tournament={t} />
      ))}
    </Section>
  );
}

function TournamentCard({ tournament: t }: { tournament: AdminTournament }) {
  const { event } = useAdmin();
  const api = useTournamentsAdmin(event.id);
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [showRegs, setShowRegs] = useState(false);
  const unsynced = t.registrations.filter((r) => !r.syncedToChallonge).length;

  const toggleOpen = (open: boolean) =>
    api.update.mutate(
      { id: t.id, body: { ...toRequest(t), registrationOpen: open } },
      { onError: (e) => toast(errorMessage(e), 'error') },
    );
  const action = (fn: typeof api.sync, label: string) =>
    fn.mutate(t.id, { onSuccess: () => toast(label), onError: (e) => toast(errorMessage(e), 'error') });

  if (editing) return <TournamentEditor id={t.id} initial={toRequest(t)} onDone={() => setEditing(false)} />;

  return (
    <div className="subcard">
      <div className="subcard__head">
        <span className="subcard__title">
          <span className="tn-color" style={{ background: t.color }} />
          {t.name}
        </span>
        <label className="check check--sm">
          <input type="checkbox" checked={t.registrationOpen} onChange={(e) => toggleOpen(e.target.checked)} />
          Anmeldung offen
        </label>
      </div>
      <div className="kv">
        <span>Teilnehmer</span>
        <span className="mono">
          {t.registrations.length}/{t.maxParticipants}
          {t.teamSize > 1 ? ` Teams (${t.teamSize}er)` : ''}
        </span>
        {t.registrationClosesAt && (
          <>
            <span>Anmeldeschluss</span>
            <span className="mono">{formatDateTime(t.registrationClosesAt, event.timezone)}</span>
          </>
        )}
        <span>Challonge</span>
        <span className="mono">{t.challongeSlug ?? '–'}</span>
        {t.snapshotAt && (
          <>
            <span>Baum geladen</span>
            <span className="mono">{formatDateTime(t.snapshotAt, event.timezone)}</span>
          </>
        )}
      </div>
      {unsynced > 0 && t.challongeSlug && <p className="small warn-text no-margin">{unsynced} Anmeldung(en) noch nicht auf Challonge.</p>}
      <div className="row-actions wrap">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
          Bearbeiten
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowRegs((v) => !v)}>
          Anmeldungen ({t.registrations.length})
        </button>
        {t.challongeSlug && (
          <>
            <button type="button" className="btn btn--ghost btn--sm" disabled={api.sync.isPending} onClick={() => action(api.sync, 'Mit Challonge synchronisiert')}>
              Sync
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={api.start.isPending}
              onClick={() => window.confirm(`${t.name} auf Challonge starten? Danach sind keine neuen Teilnehmer mehr möglich.`) && action(api.start, 'Turnier gestartet')}
            >
              Starten
            </button>
          </>
        )}
      </div>
      {showRegs && (
        <ul className="reg-list">
          {t.registrations.length === 0 && <li className="muted">Keine Anmeldungen.</li>}
          {t.registrations.map((r) => (
            <li key={r.id}>
              <span>
                <strong>{r.teamName ?? r.gamertag}</strong>
                {r.teamName && <span className="muted"> · {r.gamertag}{r.teammates ? ', ' + r.teammates : ''}</span>}
                {r.seatLabel && <span className="mono muted"> @ {r.seatLabel}</span>}
                {!r.syncedToChallonge && t.challongeSlug && <span className="chip chip--warn reg-list__chip">nicht gesynct</span>}
              </span>
              <RemoveButton
                label="Anmeldung löschen"
                onClick={() =>
                  window.confirm(`Anmeldung von ${r.teamName ?? r.gamertag} löschen?`) &&
                  api.removeRegistration.mutate({ id: t.id, registrationId: r.id }, { onError: (e) => toast(errorMessage(e), 'error') })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TournamentEditor({ id, initial, onDone }: { id?: number; initial: TournamentRequest; onDone: () => void }) {
  const { event } = useAdmin();
  const api = useTournamentsAdmin(event.id);
  const servers = useServersAdmin(event.id).query.data ?? [];
  const toast = useToast();
  const [t, setT] = useState<TournamentRequest>(initial);
  const set = <K extends keyof TournamentRequest>(key: K, value: TournamentRequest[K]) => setT((prev) => ({ ...prev, [key]: value }));
  const pending = api.create.isPending || api.update.isPending;

  const save = () => {
    const opts = {
      onSuccess: () => {
        toast('Turnier gespeichert');
        onDone();
      },
      onError: (e: unknown) => toast(errorMessage(e), 'error'),
    };
    if (id != null) api.update.mutate({ id, body: t }, opts);
    else api.create.mutate(t, opts);
  };

  return (
    <div className="subcard subcard--edit">
      <div className="form-grid">
        <label className="lbl span-2">
          Name
          <input className="in" value={t.name} onChange={(e) => set('name', e.target.value)} placeholder="CS2 5v5" autoFocus />
        </label>
        <label className="lbl span-2">
          Format / Beschreibung
          <input className="in" value={t.formatLabel ?? ''} onChange={(e) => set('formatLabel', e.target.value)} placeholder="Double Elimination · 16 Teams" />
        </label>
        <label className="lbl">
          Max. Teilnehmer
          <input className="in mono" type="number" min={2} value={t.maxParticipants} onChange={(e) => set('maxParticipants', Number(e.target.value))} />
        </label>
        <label className="lbl">
          Spieler pro Team
          <input className="in mono" type="number" min={1} max={20} value={t.teamSize} onChange={(e) => set('teamSize', Number(e.target.value))} />
        </label>
        <label className="lbl">
          Start
          <DateTimeInput value={t.startsAt} onChange={(v) => set('startsAt', v)} timeZone={event.timezone} />
        </label>
        <label className="lbl">
          Anmeldeschluss
          <DateTimeInput value={t.registrationClosesAt} onChange={(v) => set('registrationClosesAt', v)} timeZone={event.timezone} />
        </label>
        <label className="lbl">
          Server
          <select className="in" value={t.serverId ?? ''} onChange={(e) => set('serverId', e.target.value ? Number(e.target.value) : null)}>
            <option value="">–</option>
            {servers.filter((s) => s.id != null).map((s) => (
              <option key={s.id} value={s.id!}>
                {s.shortCode ?? s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="lbl">
          Farbe
          <span className="color-pick">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={'color-pick__swatch' + (t.color === c ? ' is-on' : '')}
                style={{ background: c }}
                aria-label={c}
                onClick={() => set('color', c)}
              />
            ))}
          </span>
        </label>
        <label className="lbl span-2">
          Challonge-URL oder Kürzel
          <input className="in mono" value={t.challongeSlug ?? ''} onChange={(e) => set('challongeSlug', e.target.value)} placeholder="https://challonge.com/vivolan_cs2" />
        </label>
        <label className="lbl span-2">
          Link zu den Regeln (optional)
          <input className="in mono" value={t.rulesUrl ?? ''} onChange={(e) => set('rulesUrl', e.target.value)} placeholder="https://…" />
        </label>
      </div>
      <p className="small muted no-margin">Mit Anmeldeschluss erscheint 30 Minuten vorher automatisch ein Hinweis im Durchsage-Band.</p>
      <label className="check">
        <input type="checkbox" checked={t.registrationOpen} onChange={(e) => set('registrationOpen', e.target.checked)} />
        Anmeldung offen
      </label>
      <div className="row-actions wrap">
        <button type="button" className="btn btn--primary btn--sm" disabled={pending || !t.name.trim()} onClick={save}>
          Speichern
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDone}>
          Abbrechen
        </button>
        {id != null && (
          <button
            type="button"
            className="btn btn--danger btn--sm push-right"
            onClick={() => window.confirm(`${t.name} inkl. Anmeldungen löschen?`) && api.remove.mutate(id, { onSuccess: onDone })}
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
