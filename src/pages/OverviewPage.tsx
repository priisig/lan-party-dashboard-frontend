import { type Ref, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useEventInfo, useLive, useSchedule, useSeats, useServers, useTournaments } from '../api/queries';
import type { PublicServer, ScheduleEntry, ScheduleStatus } from '../api/types';
import { useNow } from '../hooks/useNow';
import { formatDuration, formatTime } from '../lib/time';
import { useLayout } from '../layout/TierContext';
import './overview.css';

export function OverviewPage() {
  return (
    <main className="page overview">
      <div className="ov-col ov-col--left">
        <WelcomeCard />
        <InfosCard />
      </div>
      <div className="ov-col ov-col--center">
        <NowCard />
        <ScheduleCard />
      </div>
      <div className="ov-col ov-col--right">
        <ServersCard />
        <SignupCard />
        <SeatsCard />
      </div>
    </main>
  );
}

function WelcomeCard() {
  const { data } = useEventInfo();
  const event = data?.event;
  if (!event?.welcomeTitle && !event?.welcomeText) return null;
  return (
    <section className="card ov-welcome">
      <h2 className="h">Willkommen</h2>
      {event.welcomeTitle && (
        <p className="ov-welcome__title">
          {event.welcomeTitle.split('\n').map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      )}
      {event.welcomeText && <p className="ov-welcome__text">{event.welcomeText}</p>}
    </section>
  );
}

function InfosCard() {
  const { data } = useEventInfo();
  const infos = data?.infos ?? [];
  if (infos.length === 0) return null;
  return (
    <section className="card ov-infos">
      <h2 className="h">Wichtige Infos</h2>
      <dl className="ov-infos__list">
        {infos.map((info, i) => (
          <div key={i} className="ov-infos__item">
            <dt>{info.label}</dt>
            <dd>{info.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function NowCard() {
  const { data: schedule } = useSchedule();
  const { data: live } = useLive();
  const { data: info } = useEventInfo();
  const now = useNow(15_000);
  const timeZone = info?.event.timezone ?? 'Europe/Zurich';
  const current = schedule?.live ?? null;
  const next = schedule?.next ?? null;

  const progress = current
    ? Math.min(100, Math.max(0, ((now.getTime() - Date.parse(current.startsAt)) / (Date.parse(current.endsAt) - Date.parse(current.startsAt))) * 100))
    : 0;
  const round =
    current?.tournamentId != null && live?.tournamentId === current.tournamentId && live.text?.includes(' – ')
      ? live.text.split(' – ').slice(1).join(' – ')
      : null;
  const subline = [round, current?.location ? `Ort ${current.location}` : null].filter(Boolean).join(' · ');
  const tournamentLink = current?.tournamentId ?? next?.tournamentId ?? null;

  return (
    <section className="card card--accent ov-now">
      <div className="ov-now__main">
        {current ? (
          <>
            <h2 className="h">
              <span className="dot dot--sm live" style={{ background: 'var(--green)' }} />
              Läuft gerade
            </h2>
            <p className="ov-now__title">{current.title}</p>
            {subline && <p className="ov-now__sub">{subline}</p>}
            <div className="bar ov-now__bar">
              <span style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--purple), var(--blue))' }} />
            </div>
            <div className="ov-now__times mono">
              <span>{formatTime(current.startsAt, timeZone)}</span>
              <span>{formatTime(current.endsAt, timeZone)}</span>
            </div>
          </>
        ) : (
          <>
            <h2 className="h">Gerade</h2>
            <p className="ov-now__title">{next ? 'Pause' : 'Programm beendet'}</p>
            <p className="ov-now__sub">{next ? 'Free Play auf allen Servern bis zum nächsten Programmpunkt.' : 'Danke fürs Mitmachen!'}</p>
          </>
        )}
      </div>
      <div className="ov-now__divider" />
      <div className="ov-now__side">
        <div className="ov-now__next">
          <span className="h h--sm">Als Nächstes</span>
          {next ? (
            <>
              <span className="ov-now__next-title">{next.title}</span>
              <span className="mono ov-now__next-time">
                {formatTime(next.startsAt, timeZone)} · in {formatDuration(Date.parse(next.startsAt) - now.getTime())}
              </span>
            </>
          ) : (
            <span className="muted">–</span>
          )}
        </div>
        {tournamentLink != null && (
          <Link to={`/turniere?t=${tournamentLink}`} className="btn btn--primary">
            Turnierbaum ansehen →
          </Link>
        )}
      </div>
    </section>
  );
}

const STATUS_LABEL: Record<ScheduleStatus, { text: string; chip: string }> = {
  DONE: { text: 'Beendet', chip: 'chip--done' },
  LIVE: { text: '● Läuft', chip: 'chip--live' },
  NEXT: { text: 'Als Nächstes', chip: 'chip--next' },
  PLANNED: { text: 'Geplant', chip: 'chip--plan' },
};

function ScheduleCard() {
  const { data } = useSchedule();
  const { kiosk } = useLayout();
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? data?.currentDay ?? data?.days[0]?.key ?? null;
  const items = useMemo(() => data?.days.find((d) => d.key === day)?.items ?? [], [data, day]);
  const liveRef = useRef<HTMLDivElement>(null);

  // On the beamer, keep the running item in view when the list is longer than the card.
  useEffect(() => {
    if (kiosk) liveRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [kiosk, items]);

  return (
    <section className="card ov-schedule">
      <div className="card-head">
        <h2 className="h">Zeitplan</h2>
        {data && data.days.length > 1 && (
          <div role="tablist" aria-label="Tag" className="segmented">
            {data.days.map((d) => (
              <button
                key={d.key}
                role="tab"
                aria-selected={d.key === day}
                className={'segmented__btn' + (d.key === day ? ' is-on' : '')}
                onClick={() => setPicked(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div role="table" aria-label="Zeitplan" className="sched">
        <div role="row" className="sched__row sched__row--head">
          <span role="columnheader">Zeit</span>
          <span role="columnheader">Programm</span>
          <span role="columnheader">Ort / Server</span>
          <span role="columnheader">Status</span>
        </div>
        <div className="sched__body">
          {items.length === 0 && <p className="empty">Für diesen Tag ist nichts geplant.</p>}
          {items.map((item) => (
            <ScheduleRow key={item.id} item={item} rowRef={item.status === 'LIVE' ? liveRef : undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ScheduleRow({ item, rowRef }: { item: ScheduleEntry; rowRef?: Ref<HTMLDivElement> }) {
  const status = STATUS_LABEL[item.status];
  return (
    <div role="row" ref={rowRef} className={`sched__row sched__row--${item.status.toLowerCase()}`}>
      <span role="cell" className="mono sched__time">
        {item.time}
      </span>
      <span role="cell" className="sched__title">
        <span className="sched__color" style={{ background: item.color }} />
        <span className="sched__text">{item.title}</span>
      </span>
      <span role="cell" className="mono sched__where">
        {item.location ?? ''}
      </span>
      <span role="cell" className="sched__status">
        <span className={'chip ' + status.chip}>{status.text}</span>
      </span>
    </div>
  );
}

function ServersCard() {
  const { data } = useServers();
  const { data: info } = useEventInfo();
  const timeZone = info?.event.timezone ?? 'Europe/Zurich';
  if (!data || data.length === 0) return null;
  return (
    <section className="card ov-servers">
      <div className="card-head">
        <h2 className="h">Game Server</h2>
        <span className="small muted">Klick = verbinden</span>
      </div>
      <ul className="srv">
        {data.map((s) => (
          <ServerItem key={s.id} server={s} timeZone={timeZone} />
        ))}
      </ul>
    </section>
  );
}

function ServerItem({ server, timeZone }: { server: PublicServer; timeZone: string }) {
  let players: string;
  if (server.availableFrom) players = `ab ${formatTime(server.availableFrom, timeZone)}`;
  else if (server.players != null) players = `${server.players}/${server.maxPlayers ?? '?'}`;
  else if (!server.online) players = 'offline';
  else players = '';
  const content = (
    <>
      <span className="srv__name">{server.name}</span>
      <span className="mono srv__addr">{server.address}</span>
    </>
  );
  return (
    <li className="srv__item">
      <span className="dot" style={{ background: server.online ? 'var(--green)' : 'var(--grey)' }} title={server.online ? 'online' : 'offline'} />
      {server.connectUrl ? (
        <a href={server.connectUrl} className="srv__link">
          {content}
        </a>
      ) : (
        <span className="srv__link">{content}</span>
      )}
      <span className={'mono srv__players' + (server.online ? '' : ' is-off')}>{players}</span>
    </li>
  );
}

function SignupCard() {
  const { data } = useTournaments();
  const open = (data ?? []).filter((t) => t.acceptsRegistrations);
  return (
    <section className="card ov-signup">
      <h2 className="h">Turnier-Anmeldung</h2>
      {open.length === 0 && <p className="empty">Aktuell sind keine Anmeldungen offen.</p>}
      {open.map((t) => {
        const pct = Math.min(100, Math.round((t.registered / Math.max(1, t.maxParticipants)) * 100));
        return (
          <div key={t.id} className="signup">
            <div className="signup__head">
              <span className="signup__name">{t.name}</span>
              <span className="mono muted">
                {t.registered}/{t.maxParticipants}
                {t.teamSize > 1 ? ' Teams' : ''}
              </span>
            </div>
            <div className="bar">
              <span style={{ width: `${pct}%`, background: t.color }} />
            </div>
          </div>
        );
      })}
      {open.length > 0 && (
        <Link to="/turniere" className="btn btn--go ov-signup__btn">
          Jetzt anmelden →
        </Link>
      )}
    </section>
  );
}

function SeatsCard() {
  const { data } = useSeats();
  if (!data || data.total === 0) return null;
  const capacity = data.total - data.blocked;
  return (
    <section className="card ov-seats">
      <div className="ov-seats__text">
        <h2 className="h">Sitzplätze</h2>
        <span className="ov-seats__count">
          {data.taken} / {capacity} belegt
        </span>
      </div>
      <Link to="/sitzplan" className="btn btn--outline">
        Platz reservieren
      </Link>
    </section>
  );
}
