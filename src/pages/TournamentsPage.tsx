import { type FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useEventInfo, useRegister, useTournament, useTournaments } from '../api/queries';
import { errorMessage } from '../api/client';
import type { TournamentDetail, TournamentStatusKind, TournamentSummary } from '../api/types';
import { BracketView } from '../components/bracket/BracketView';
import { Icon } from '../components/Icon';
import { formatTime } from '../lib/time';
import { loadPref, savePref } from '../lib/storage';
import './tournaments.css';

const STATUS_COLOR: Record<TournamentStatusKind, string> = {
  LIVE: 'var(--green-text)',
  OPEN: 'var(--blue-text)',
  PLANNED: 'var(--text-muted)',
  CLOSED: 'var(--text-muted)',
  DONE: 'var(--text-dim)',
};

export function TournamentsPage() {
  const { data: list } = useTournaments();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('t')) || null;
  const fallback = list?.find((t) => t.statusKind === 'LIVE') ?? list?.[0];
  const selectedId = list?.some((t) => t.id === requested) ? requested : (fallback?.id ?? null);
  const { data: detail } = useTournament(selectedId);

  const select = (id: number) => setParams({ t: String(id) }, { replace: true });

  if (list && list.length === 0) {
    return (
      <main className="page">
        <section className="card">
          <h2 className="h">Turniere</h2>
          <p className="empty">Für diesen Event sind noch keine Turniere eingetragen.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page tournaments">
      <nav aria-label="Turniere" className="card tn-list">
        <h2 className="h tn-list__title">Turniere</h2>
        <div className="tn-list__items">
          {(list ?? []).map((t) => (
            <button
              key={t.id}
              className={'tn-item' + (t.id === selectedId ? ' is-on' : '')}
              aria-current={t.id === selectedId}
              onClick={() => select(t.id)}
            >
              <span className="tn-item__name">
                <span className="tn-item__color" style={{ background: t.color }} />
                {t.name}
              </span>
              <span className="tn-item__status" style={{ color: STATUS_COLOR[t.statusKind] }}>
                {t.statusText}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <section className="card tn-bracket">{detail ? <BracketPanel detail={detail} /> : <p className="empty">Lade …</p>}</section>

      <section className="card tn-side">
        <RegistrationForm tournaments={list ?? []} preferredId={selectedId} />
        {detail && <Participants detail={detail} />}
      </section>
    </main>
  );
}

function BracketPanel({ detail }: { detail: TournamentDetail }) {
  const { data: info } = useEventInfo();
  const t = detail.summary;
  const meta = [t.formatLabel, t.serverName ? `Server ${t.serverName}` : null].filter(Boolean).join(' · ');
  return (
    <>
      <div className="tn-head">
        <div className="tn-head__text">
          <h2 className="display tn-head__name">{t.name}</h2>
          {meta && <span className="soft">{meta}</span>}
        </div>
        {t.challongeUrl && (
          <a href={t.challongeUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">
            Auf Challonge öffnen <Icon name="external" size={16} />
          </a>
        )}
      </div>
      <div className="tn-board">
        {detail.bracket && detail.bracket.rounds.length > 0 ? (
          <BracketView bracket={detail.bracket} />
        ) : (
          <div className="tn-board__empty">
            <p className="display">Turnierbaum folgt</p>
            <p className="muted">
              {t.challongeUrl
                ? 'Sobald das Turnier auf Challonge gestartet ist, erscheint hier der Baum.'
                : t.acceptsRegistrations
                  ? 'Melde dich rechts an – der Baum wird nach Anmeldeschluss erstellt.'
                  : 'Für dieses Turnier gibt es (noch) keinen Turnierbaum.'}
            </p>
          </div>
        )}
        {detail.snapshotAt && info && (
          <span className="tn-board__stamp">Challonge · aktualisiert automatisch · Stand {formatTime(detail.snapshotAt, info.event.timezone)}</span>
        )}
      </div>
    </>
  );
}

function RegistrationForm({ tournaments, preferredId }: { tournaments: TournamentSummary[]; preferredId: number | null }) {
  const open = tournaments.filter((t) => t.acceptsRegistrations);
  const [chosen, setChosen] = useState<number | null>(null);
  const tournamentId = chosen != null && open.some((t) => t.id === chosen) ? chosen : (open.find((t) => t.id === preferredId)?.id ?? open[0]?.id ?? null);
  const tournament = open.find((t) => t.id === tournamentId) ?? null;
  const register = useRegister(tournamentId);

  const [gamertag, setGamertag] = useState(() => loadPref('gamertag'));
  const [teamName, setTeamName] = useState('');
  const [teammates, setTeammates] = useState('');
  const [seat, setSeat] = useState(() => loadPref('seat'));
  const [rules, setRules] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => setDone(null), [tournamentId]);

  if (open.length === 0) {
    return (
      <div className="tn-form">
        <h2 className="h">Anmelden</h2>
        <p className="empty">Zurzeit sind keine Anmeldungen offen.</p>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate(
      { gamertag, teamName: teamName || undefined, teammates: teammates || undefined, seatLabel: seat || undefined, rulesAccepted: rules },
      {
        onSuccess: () => {
          savePref('gamertag', gamertag);
          savePref('seat', seat);
          setDone(`${teamName || gamertag} ist für ${tournament?.name} angemeldet. GL & HF!`);
          setTeamName('');
          setTeammates('');
          setRules(false);
        },
      },
    );
  };

  const team = (tournament?.teamSize ?? 1) > 1;
  return (
    <form className="tn-form" onSubmit={submit}>
      <h2 className="h">Anmelden</h2>
      <label className="lbl">
        Turnier
        <select className="in" value={tournamentId ?? ''} onChange={(e) => setChosen(Number(e.target.value))}>
          {open.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.registered}/{t.maxParticipants}
              {t.teamSize > 1 ? ' Teams' : ''}
            </option>
          ))}
        </select>
      </label>
      {tournament?.registrationClosesAt && <ClosingHint closesAt={tournament.registrationClosesAt} />}
      <label className="lbl">
        Gamertag
        <input className="in" required maxLength={60} value={gamertag} onChange={(e) => setGamertag(e.target.value)} placeholder="z. B. xXSniperXx" />
      </label>
      {team && (
        <>
          <label className="lbl">
            Teamname
            <input className="in" required maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Dein Team" />
          </label>
          <label className="lbl">
            Mitspieler ({(tournament?.teamSize ?? 2) - 1})
            <input className="in" maxLength={300} value={teammates} onChange={(e) => setTeammates(e.target.value)} placeholder="Gamertags, mit Komma getrennt" />
          </label>
        </>
      )}
      <label className="lbl">
        Sitzplatz
        <input className="in mono" maxLength={20} value={seat} onChange={(e) => setSeat(e.target.value.toUpperCase())} placeholder="z. B. A7" />
      </label>
      <label className="check">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} required />
        <span>
          Ich habe die{' '}
          {tournament?.rulesUrl ? (
            <a href={tournament.rulesUrl} target="_blank" rel="noreferrer">
              Turnierregeln
            </a>
          ) : (
            'Turnierregeln'
          )}{' '}
          gelesen
        </span>
      </label>
      {register.error && <div className="error-box">{errorMessage(register.error)}</div>}
      {done && <div className="ok-box">{done}</div>}
      <button type="submit" className="btn btn--go tn-form__submit" disabled={register.isPending}>
        {register.isPending ? 'Sende …' : 'Anmeldung absenden'}
      </button>
    </form>
  );
}

function ClosingHint({ closesAt }: { closesAt: string }) {
  const { data: info } = useEventInfo();
  if (!info) return null;
  return <p className="small muted tn-form__hint">Anmeldeschluss {formatTime(closesAt, info.event.timezone)} Uhr</p>;
}

function Participants({ detail }: { detail: TournamentDetail }) {
  const t = detail.summary;
  return (
    <div className="tn-participants">
      <div className="tn-participants__head">
        <span className="h h--sm">Angemeldet · {t.name}</span>
        <span className="mono muted">
          {detail.participants.length}/{t.maxParticipants}
        </span>
      </div>
      {detail.participants.length === 0 ? (
        <p className="empty">Noch niemand – sei die/der Erste!</p>
      ) : (
        <div className="tn-participants__list">
          {detail.participants.map((p) => (
            <span key={p} className="pill">
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
