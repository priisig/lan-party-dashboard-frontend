import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMe, useMyEvent, useTournamentSignup } from '../api/auth';
import { errorMessage } from '../api/client';
import { useEventInfo, useTournament, useTournaments } from '../api/queries';
import type { TournamentDetail, TournamentSummary } from '../api/types';
import { Avatar } from '../components/Avatar';
import { BracketView } from '../components/bracket/BracketView';
import { Icon } from '../components/Icon';
import { SectionHead } from '../components/SectionHead';
import { useLayout } from '../layout/TierContext';
import { formatDateTime, formatTime } from '../lib/time';
import { TOURNAMENT_CHIP } from './OverviewPage';
import './tournaments.css';

export function TournamentsPage() {
  const { data: list } = useTournaments();
  const { data: info } = useEventInfo();
  const { kiosk } = useLayout();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('t')) || null;
  const fallback = list?.find((t) => t.statusKind === 'LIVE') ?? list?.[0];
  const selectedId = list?.some((t) => t.id === requested) ? requested : (fallback?.id ?? null);
  const { data: detail } = useTournament(selectedId);
  const select = (id: number) => setParams({ t: String(id) }, { replace: true });
  const title = info?.event.headings?.tournaments || 'Turniere';

  const tabs = (
    <div role="tablist" aria-label="Turnier wählen" className="tn-tabs">
      {(list ?? []).map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === selectedId} className={'tn-tab' + (t.id === selectedId ? ' is-on' : '')} onClick={() => select(t.id)}>
          <span className="tn-tab__color" style={{ background: t.color }} />
          {t.name}
          <span className={'chip ' + TOURNAMENT_CHIP[t.statusKind]}>{t.statusText}</span>
        </button>
      ))}
    </div>
  );

  if (list && list.length === 0) {
    return (
      <main className="site-page">
        <SectionHead eyebrow="COMPETE" title={title} as="h1" />
        <p className="empty">Für diesen Event sind noch keine Turniere eingetragen.</p>
      </main>
    );
  }

  if (kiosk) {
    return (
      <main className="page tournaments--kiosk">
        {tabs}
        <section className="card tn-bracket">{detail ? <BracketPanel detail={detail} /> : <p className="empty">Lade …</p>}</section>
      </main>
    );
  }

  return (
    <main className="site-page tournaments">
      <SectionHead eyebrow="COMPETE" title={title} as="h1" />
      {tabs}
      {detail && <InfoTiles detail={detail} />}
      <section aria-labelledby="baum" className="card tn-bracket">
        {detail ? <BracketPanel detail={detail} /> : <p className="empty">Lade …</p>}
      </section>
      {detail && <Participants detail={detail} />}
    </main>
  );
}

function InfoTiles({ detail }: { detail: TournamentDetail }) {
  const { data: info } = useEventInfo();
  const t = detail.summary;
  const tz = info?.event.timezone ?? 'Europe/Zurich';
  const tiles = [
    ['Modus', t.formatLabel ?? (t.teamSize > 1 ? `${t.teamSize}er-Teams` : '1 gegen 1')],
    ['Start', t.startsAt ? formatDateTime(t.startsAt, tz) : 'offen'],
    ['Ort / Server', t.serverName ?? '–'],
    ['Teilnehmende', `${detail.participants.length} / ${t.maxParticipants}${t.teamSize > 1 ? ' Teams' : ''}`],
    ['Anmeldeschluss', t.registrationClosesAt ? formatDateTime(t.registrationClosesAt, tz) : t.acceptsRegistrations ? 'offen' : 'geschlossen'],
  ];
  return (
    <div className="tn-tiles">
      {tiles.map(([k, v]) => (
        <div key={k} className="tile">
          <div className="k">{k}</div>
          <div className="tn-tiles__v">{v}</div>
        </div>
      ))}
    </div>
  );
}

function BracketPanel({ detail }: { detail: TournamentDetail }) {
  const { data: info } = useEventInfo();
  const t = detail.summary;
  return (
    <>
      <div className="card-head">
        <h2 id="baum" className="card-title">
          Turnierbaum · {t.name}
        </h2>
        <div className="tn-bracket__meta">
          <span className="seat-legend">
            <span>
              <span className="seat-legend__box" style={{ background: 'var(--green)' }} />
              Sieger
            </span>
            <span>
              <span className="seat-legend__box" style={{ border: '2px solid var(--purple)' }} />
              Läuft gerade
            </span>
          </span>
          {t.challongeUrl && (
            <a href={t.challongeUrl} target="_blank" rel="noreferrer" className="btn btn--outline btn--sm">
              Challonge <Icon name="external" size={16} />
            </a>
          )}
        </div>
      </div>
      <div className="tn-board">
        {detail.bracket && detail.bracket.rounds.length > 0 ? (
          <BracketView bracket={detail.bracket} />
        ) : (
          <div className="tn-board__empty">
            <Icon name="trophy" size={36} />
            <p className="display">Turnierbaum folgt</p>
            <p className="muted no-margin">
              {t.challongeUrl
                ? 'Sobald das Turnier auf Challonge gestartet ist, erscheint hier der Baum.'
                : t.acceptsRegistrations
                  ? 'Melde dich an – der Baum wird nach Anmeldeschluss erstellt.'
                  : 'Für dieses Turnier gibt es (noch) keinen Turnierbaum.'}
            </p>
          </div>
        )}
        {detail.snapshotAt && info && <span className="tn-board__stamp">Challonge · Stand {formatTime(detail.snapshotAt, info.event.timezone)}</span>}
      </div>
    </>
  );
}

function Participants({ detail }: { detail: TournamentDetail }) {
  const t = detail.summary;
  const team = t.teamSize > 1;
  return (
    <section aria-labelledby="teams" className="tn-teams">
      <div className="section-head">
        <h2 id="teams" className="card-title tn-teams__title">
          {team ? 'Angemeldete Teams' : 'Angemeldete Spieler'}{' '}
          <span className="mono muted">
            {detail.participants.length}/{t.maxParticipants}
          </span>
        </h2>
      </div>
      <SignupPanel tournament={t} />
      {detail.participants.length === 0 ? (
        <p className="empty">Noch niemand – sei die/der Erste!</p>
      ) : (
        <div className="tn-teams__grid">
          {detail.participants.map((p, i) => (
            <div key={p} className="card tn-team">
              <Avatar nickname={p} />
              <div className="tn-team__text">
                <div className="tn-team__name">{p}</div>
                <div className="small muted">Seed {i + 1}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Sign-up for the logged-in user, or a login prompt. Shows "withdraw" when already registered. */
function SignupPanel({ tournament }: { tournament: TournamentSummary }) {
  const me = useMe();
  const my = useMyEvent(!!me.data);
  const signup = useTournamentSignup(tournament.id);
  const { data: info } = useEventInfo();
  const [open, setOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teammates, setTeammates] = useState('');
  const [rules, setRules] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const mine = my.data?.tournaments.find((x) => x.tournamentId === tournament.id) ?? null;
  const team = tournament.teamSize > 1;

  useEffect(() => {
    setOpen(false);
    setDone(null);
  }, [tournament.id]);

  if (mine) {
    return (
      <div className="card tn-signup tn-signup--done">
        <span>
          <Icon name="check" size={18} /> Du bist angemeldet{mine.teamName ? ` mit Team «${mine.teamName}»` : ''}.
        </span>
        {signup.withdraw.error && <div className="error-box">{errorMessage(signup.withdraw.error)}</div>}
        <button
          type="button"
          className="btn btn--danger btn--sm"
          disabled={signup.withdraw.isPending}
          onClick={() => window.confirm(`Anmeldung für ${tournament.name} zurückziehen?`) && signup.withdraw.mutate()}
        >
          Abmelden
        </button>
      </div>
    );
  }
  if (!tournament.acceptsRegistrations) return done ? <div className="ok-box">{done}</div> : null;
  if (!me.data) {
    return (
      <div className="card tn-signup">
        <span className="muted">Für die Anmeldung brauchst du einen Account.</span>
        <Link to={`/login?next=${encodeURIComponent(`/turniere?t=${tournament.id}`)}`} className="btn btn--primary">
          Anmelden, um mitzuspielen
        </Link>
      </div>
    );
  }
  if (!open) {
    return (
      <div className="tn-signup-cta">
        <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
          {team ? 'Team anmelden' : 'Als Spieler anmelden'}
        </button>
        {tournament.registrationClosesAt && <span className="small muted">Anmeldeschluss {formatDateTime(tournament.registrationClosesAt, info?.event.timezone ?? 'Europe/Zurich')}</span>}
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signup.register.mutate(
      { teamName: teamName || undefined, teammates: teammates || undefined, rulesAccepted: rules },
      {
        onSuccess: () => {
          setDone(`${teamName || me.data!.nickname} ist für ${tournament.name} angemeldet. GL & HF!`);
          setOpen(false);
          setTeamName('');
          setTeammates('');
          setRules(false);
        },
      },
    );
  };

  return (
    <form className="card tn-signup-form" onSubmit={submit}>
      <h3 className="card-title card-title--sm">{team ? 'Team anmelden' : 'Anmelden'} · {tournament.name}</h3>
      <p className="small muted no-margin">
        Du spielst als <strong>{me.data.nickname}</strong>
        {my.data?.seat ? ` (Platz ${my.data.seat})` : ''}.
      </p>
      {team && (
        <div className="form-grid">
          <label className="lbl">
            Teamname
            <input className="in" required maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Dein Team" />
          </label>
          <label className="lbl">
            Mitspieler ({tournament.teamSize - 1})
            <input className="in" maxLength={300} value={teammates} onChange={(e) => setTeammates(e.target.value)} placeholder="Nicknames, mit Komma getrennt" />
          </label>
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} required />
        <span>
          Ich habe die{' '}
          {tournament.rulesUrl ? (
            <a href={tournament.rulesUrl} target="_blank" rel="noreferrer">
              Turnierregeln
            </a>
          ) : (
            'Turnierregeln'
          )}{' '}
          gelesen
        </span>
      </label>
      {signup.register.error && <div className="error-box">{errorMessage(signup.register.error)}</div>}
      <div className="row-actions">
        <button type="button" className="btn btn--outline" onClick={() => setOpen(false)}>
          Abbrechen
        </button>
        <button type="submit" className="btn btn--primary" disabled={signup.register.isPending}>
          {signup.register.isPending ? 'Sende …' : 'Anmeldung absenden'}
        </button>
      </div>
    </form>
  );
}

