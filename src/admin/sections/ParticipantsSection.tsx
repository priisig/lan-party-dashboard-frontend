import { useMemo, useState } from 'react';
import { errorMessage } from '../../api/client';
import type { AdminUserView } from '../../api/types';
import { useAdmin } from '../AdminContext';
import { useParticipants } from '../adminApi';
import { useToast } from '../Toast';
import { Section, Switch } from './common';

type Filter = 'event' | 'all';

function csv(rows: AdminUserView[]): string {
  const esc = (v: string | null | boolean) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Nickname', 'E-Mail', 'Vorname', 'Nachname', 'Platz', 'Bezahlt', 'Eingecheckt', 'Rolle'];
  const lines = rows.map((r) => [r.nickname, r.email, r.firstName, r.lastName, r.seat, r.paid ? 'ja' : 'nein', r.checkedIn ? 'ja' : 'nein', r.role].map(esc).join(';'));
  return '﻿' + [head.join(';'), ...lines].join('\r\n');
}

/** Accounts with payment, check-in and role; password reset because there is no e-mail. */
export function ParticipantsSection() {
  const { event, me } = useAdmin();
  const api = useParticipants(event.id);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('event');
  const [revealed, setRevealed] = useState<{ nickname: string; password: string } | null>(null);
  const fail = (e: unknown) => toast(errorMessage(e), 'error');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (api.query.data ?? [])
      .filter((u) => filter === 'all' || u.participant || u.role === 'ORGA')
      .filter((u) => !q || [u.nickname, u.email, u.firstName, u.lastName, u.seat].some((v) => v?.toLowerCase().includes(q)));
  }, [api.query.data, search, filter]);

  const download = () => {
    const blob = new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `teilnehmer-${event.slug}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Section
      id="teilnehmer"
      title="Teilnehmer & Accounts"
      wide
      action={
        <div className="row-actions wrap">
          <input className="in participants__search" type="search" aria-label="Teilnehmer suchen" placeholder="Suchen …" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="in participants__filter" aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="event">Dieser Event</option>
            <option value="all">Alle Accounts</option>
          </select>
          <button type="button" className="btn btn--outline btn--sm" onClick={download} disabled={rows.length === 0}>
            CSV exportieren
          </button>
        </div>
      }
    >
      {revealed && (
        <div className="ok-box code-reveal">
          <span>
            Neues Passwort für <strong>{revealed.nickname}</strong> (wird nur jetzt angezeigt):
          </span>
          <span className="mono code-reveal__code">{revealed.password}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRevealed(null)}>
            Notiert
          </button>
        </div>
      )}
      <div className="participants">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">NICKNAME</th>
              <th scope="col">E-MAIL</th>
              <th scope="col">PLATZ</th>
              <th scope="col">ZAHLUNG</th>
              <th scope="col">CHECK-IN</th>
              <th scope="col">ROLLE</th>
              <th scope="col">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  {api.query.isPending ? 'Lade …' : 'Keine Accounts gefunden.'}
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className={u.enabled ? '' : 'is-disabled'}>
                <td>
                  <strong>{u.nickname}</strong>
                  {(u.firstName || u.lastName) && <div className="small muted">{[u.firstName, u.lastName].filter(Boolean).join(' ')}</div>}
                </td>
                <td className="muted">{u.email}</td>
                <td className="mono">{u.seat ?? '–'}</td>
                <td>
                  <button
                    type="button"
                    className={'chip chip-btn ' + (u.paid ? 'chip--live' : 'chip--warn')}
                    onClick={() => api.update.mutate({ userId: u.id, paid: !u.paid, checkedIn: u.checkedIn }, { onError: fail })}
                    title="Klicken zum Umschalten"
                  >
                    {u.paid ? 'Bezahlt' : 'Offen'}
                  </button>
                </td>
                <td>
                  <Switch
                    checked={u.checkedIn}
                    label={`Check-in ${u.nickname}`}
                    onChange={(v) => api.update.mutate({ userId: u.id, paid: u.paid, checkedIn: v }, { onError: fail })}
                  />
                </td>
                <td>
                  <select
                    className="in participants__role"
                    aria-label={`Rolle von ${u.nickname}`}
                    value={u.role}
                    disabled={u.id === me.id}
                    onChange={(e) => api.role.mutate({ id: u.id, role: e.target.value as AdminUserView['role'] }, { onError: fail })}
                  >
                    <option value="USER">Teilnehmer</option>
                    <option value="ORGA">Orga</option>
                  </select>
                </td>
                <td className="admin-table__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      window.confirm(`Neues Passwort für ${u.nickname} erzeugen?`) &&
                      api.resetPassword.mutate(u.id, { onSuccess: (r) => setRevealed({ nickname: u.nickname, password: r.password }), onError: fail })
                    }
                  >
                    Passwort zurücksetzen
                  </button>
                  {u.id !== me.id && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        (u.enabled ? window.confirm(`${u.nickname} sperren? Der Account kann sich nicht mehr anmelden.`) : true) &&
                        api.enabled.mutate({ id: u.id, enabled: !u.enabled }, { onError: fail })
                      }
                    >
                      {u.enabled ? 'Sperren' : 'Entsperren'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="admin-hint no-margin">
        «Dieser Event» zeigt Accounts mit Sitzplatz, Turnieranmeldung oder Zahlung/Check-in in diesem Event. Weitere Orgas: Account registrieren lassen und hier die Rolle «Orga» geben.
      </p>
    </Section>
  );
}
