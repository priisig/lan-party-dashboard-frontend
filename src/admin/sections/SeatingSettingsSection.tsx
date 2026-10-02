import { useMemo } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../../api/client';
import type { SeatRulesDto } from '../../api/types';
import { useAdmin } from '../AdminContext';
import { useEventMutations, useSeatsAdmin } from '../adminApi';
import { useToast } from '../Toast';
import { useDraft } from '../useDraft';
import { SaveBar, Section, SwitchRow } from './common';

/** Seat self-service rules, open reservation requests and the way to the full editor. */
export function SeatingSettingsSection() {
  const { event } = useAdmin();
  const mutations = useEventMutations();
  const seats = useSeatsAdmin(event.id);
  const toast = useToast();
  const source = useMemo(() => ({ ...event.seatRules }), [event.seatRules]);
  const { draft, setDraft, dirty, reset } = useDraft<SeatRulesDto>(source, source);
  const set = <K extends keyof SeatRulesDto>(key: K, value: SeatRulesDto[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const map = seats.map.data;
  const pending = seats.pending.data ?? [];
  const fail = (e: unknown) => toast(errorMessage(e), 'error');

  const save = () =>
    mutations.seatRules.mutate(
      { id: event.id, body: draft },
      {
        onSuccess: () => {
          reset();
          toast('Sitzplan-Regeln gespeichert');
        },
        onError: fail,
      },
    );

  return (
    <Section
      id="sitzplan"
      title="Sitzplan & Reservation"
      action={
        <Link to="/admin/sitzordnung" className="btn btn--outline btn--sm">
          Saalplan-Editor
        </Link>
      }
    >
      {map && (
        <div className="kv">
          <span>Reihen</span>
          <span>
            {map.rows.length} ({map.orientation === 'COLUMNS' ? 'senkrecht' : 'waagrecht'})
          </span>
          <span>Plätze</span>
          <span>
            {map.taken} belegt · {map.free} frei · {map.blocked} gesperrt
          </span>
        </div>
      )}
      <SwitchRow
        checked={draft.selectionOpen}
        onChange={(v) => set('selectionOpen', v)}
        title="Platzwahl offen"
        on="Neue Reservationen möglich"
        off="Geschlossen – nur die Orga kann zuweisen"
      />
      <SwitchRow
        checked={draft.changeAllowed}
        onChange={(v) => set('changeAllowed', v)}
        title="Platzwechsel erlaubt"
        on="Teilnehmer dürfen selbst wechseln"
        off="Gesperrt – Wechsel nur über die Orga"
      />
      <SwitchRow
        checked={draft.approvalRequired}
        onChange={(v) => set('approvalRequired', v)}
        title="Freigabe durch Orga"
        on="Reservationen sind Anfragen, die ihr bestätigt"
        off="Plätze werden sofort gebucht"
      />
      <label className="lbl">
        «Gut zu wissen» neben dem Saalplan
        <textarea
          className="in"
          rows={2}
          maxLength={500}
          value={draft.info ?? ''}
          onChange={(e) => set('info', e.target.value)}
          placeholder="Pro Platz: 80 cm Tischfläche, 1 Steckdose und 1 LAN-Port."
        />
      </label>
      <SaveBar dirty={dirty} saving={mutations.seatRules.isPending} onSave={save} onReset={() => reset()} />

      <div className="stack-sm">
        <span className="admin-eyebrow">
          OFFENE ANFRAGEN {pending.length > 0 && <span className="chip chip--warn">{pending.length}</span>}
        </span>
        {pending.length === 0 && <p className="empty no-margin">Keine offenen Anfragen.</p>}
        {pending.map((p) => (
          <div key={p.id} className="pending">
            <span className="pending__who">
              <strong>{p.gamertag}</strong> <span className="mono muted">→ {p.seat}</span>
              {p.companions && <span className="small muted pending__with">mit {p.companions}</span>}
            </span>
            <button type="button" className="btn btn--ok btn--sm" onClick={() => seats.approve.mutate(p.id, { onError: fail })}>
              OK
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => seats.reject.mutate(p.id, { onError: fail })}>
              Ablehnen
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}
