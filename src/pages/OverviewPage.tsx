import { type Ref, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMe, useMyEvent } from '../api/auth';
import { useEventInfo, useSchedule, useSeats, useServers, useTournaments } from '../api/queries';
import type { EventView, HeadingKey, PublicServer, ScheduleEntry, TournamentStatusKind, TournamentSummary } from '../api/types';
import { AccentText } from '../components/AccentText';
import { Avatar } from '../components/Avatar';
import { CopyButton } from '../components/CopyButton';
import { Icon } from '../components/Icon';
import { SectionHead } from '../components/SectionHead';
import { SeatLegend, SeatMap } from '../components/seatmap/SeatMap';
import { QrCode } from '../components/WifiQr';
import { useNow } from '../hooks/useNow';
import { useLayout } from '../layout/TierContext';
import { formatDateRange, formatDateTime, formatDuration, formatTime, formatWeekday } from '../lib/time';
import { wifiPayload } from '../lib/wifiQr';
import './overview.css';

const DEFAULT_HEADINGS: Record<HeadingKey, string> = {
  servers: 'Gameserver',
  schedule: 'Programm',
  tournaments: 'Turniere',
  seating: 'Sitzplatzordnung',
  network: 'WLAN',
};

function heading(event: EventView | undefined, key: HeadingKey) {
  return event?.headings?.[key] || DEFAULT_HEADINGS[key];
}

export function OverviewPage() {
  const { kiosk } = useLayout();
  const location = useLocation();

  // Header links like "/#programm" scroll to their section once it is rendered.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  if (kiosk) return <KioskOverview />;

  return (
    <main className="site-page overview">
      <section aria-labelledby="willkommen" className="ov-hero">
        <Welcome />
        <NowCard />
      </section>
      <section aria-label="Profil, Teamspeak und Netzwerk" className="ov-cards">
        <ProfileCard />
        <TeamspeakCard />
        <NetworkCard />
        <InfosCard />
      </section>
      <ServersSection />
      <ScheduleSection />
      <TournamentsSection />
      <SeatingTeaser />
    </main>
  );
}

/** Beamer: the same cards, but arranged to fit one screen without scrolling. */
function KioskOverview() {
  return (
    <main className="page overview--kiosk">
      <div className="ovk-col">
        <Welcome compact />
        <NetworkCard />
      </div>
      <div className="ovk-col">
        <NowCard />
        <ScheduleSection compact />
      </div>
      <div className="ovk-col">
        <ServersSection compact />
        <SeatingTeaser compact />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- hero

function Welcome({ compact = false }: { compact?: boolean }) {
  const { data } = useEventInfo();
  const { data: seats } = useSeats();
  const { data: tournaments } = useTournaments();
  const { data: servers } = useServers();
  const me = useMe();
  const my = useMyEvent(!!me.data);
  const event = data?.event;
  const capacity = seats ? seats.total - seats.blocked : 0;
  const meta = event ? [formatDateRange(event.startsAt, event.endsAt, event.timezone), event.location].filter(Boolean).join(' · ') : '';

  return (
    <div className={'ov-welcome' + (compact ? ' card' : '')}>
      {meta && <div className="eyebrow">{meta}</div>}
      <h1 id="willkommen" className="ov-welcome__title">
        <AccentText text={event?.welcomeTitle || 'Willkommen an der {lila:LAN}.'} />
      </h1>
      {event?.welcomeText && !compact && <p className="ov-welcome__text">{event.welcomeText}</p>}
      {!compact && (
        <div className="ov-welcome__actions">
          <Link to="/sitzplan" className="btn btn--primary">
            {my.data?.seat ? 'Meine Reservation' : 'Platz reservieren'}
          </Link>
          <Link to="/#programm" className="btn btn--outline">
            Zum Programm
          </Link>
        </div>
      )}
      <div className="ov-stats">
        <div className="tile">
          <div className="v" style={{ color: 'var(--green)' }}>
            {seats?.taken ?? '–'}
            <span className="u">/{capacity || '–'}</span>
          </div>
          <div className="k">Plätze belegt</div>
        </div>
        <div className="tile">
          <div className="v" style={{ color: 'var(--purple)' }}>
            {tournaments?.length ?? '–'}
          </div>
          <div className="k">Turniere</div>
        </div>
        <div className="tile">
          <div className="v" style={{ color: 'var(--blue)' }}>
            {servers?.length ?? '–'}
          </div>
          <div className="k">Gameserver</div>
        </div>
      </div>
    </div>
  );
}

function NowCard() {
  const { data: schedule } = useSchedule();
  const { data: info } = useEventInfo();
  const now = useNow(15_000);
  const timeZone = info?.event.timezone ?? 'Europe/Zurich';
  const current = schedule?.live ?? null;
  const upcoming = useMemo(() => {
    const all = (schedule?.days ?? []).flatMap((d) => d.items);
    return all.filter((i) => i.status === 'NEXT' || i.status === 'PLANNED').slice(0, current ? 2 : 3);
  }, [schedule, current]);

  const progress = current
    ? Math.min(100, Math.max(0, ((now.getTime() - Date.parse(current.startsAt)) / (Date.parse(current.endsAt) - Date.parse(current.startsAt))) * 100))
    : 0;

  return (
    <div className="card ov-now">
      <div className="card-head">
        <h2 className="h">{current ? 'Jetzt läuft' : 'Gerade'}</h2>
        <span className="mono small muted">
          {formatWeekday(now, timeZone)} · {formatTime(now, timeZone)}
        </span>
      </div>
      {current ? (
        <div className="ov-now__live">
          <span className={'chip ' + (current.tournamentId != null ? 'chip--purple' : 'chip--live')}>{current.tournamentId != null ? 'Turnier' : 'Programm'}</span>
          <div className="ov-now__title">{current.title}</div>
          <div className="muted">
            {formatTime(current.startsAt, timeZone)} – {formatTime(current.endsAt, timeZone)}
            {current.location ? ` · ${current.location}` : ''}
          </div>
          <div className="bar ov-now__bar">
            <span style={{ width: `${progress}%`, background: 'var(--purple)' }} />
          </div>
          <div className="small muted">noch {formatDuration(Date.parse(current.endsAt) - now.getTime())}</div>
          {current.tournamentId != null && (
            <Link to={`/turniere?t=${current.tournamentId}`} className="ov-now__link">
              Turnierbaum ansehen →
            </Link>
          )}
        </div>
      ) : (
        <div className="ov-now__live ov-now__live--idle">
          <div className="ov-now__title">{upcoming.length > 0 ? 'Pause' : 'Programm beendet'}</div>
          <div className="muted">{upcoming.length > 0 ? 'Free Play auf allen Servern bis zum nächsten Programmpunkt.' : 'Danke fürs Mitmachen!'}</div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="ov-next">
          <div className="ov-next__label">ALS NÄCHSTES</div>
          {upcoming.map((item) => (
            <div key={item.id} className="ov-next__row">
              <span className="mono ov-next__time">{formatTime(item.startsAt, timeZone)}</span>
              <span className="ov-next__title">{item.title}</span>
              <span className="dot" style={{ background: item.color }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- cards row

function ProfileCard() {
  const me = useMe();
  const my = useMyEvent(!!me.data);
  if (me.isPending) return null;
  if (!me.data) {
    return (
      <div className="card ov-card">
        <div className="card-head">
          <h2 className="card-title">Dabei sein</h2>
        </div>
        <p className="muted no-margin">Mit einem Account wählst du deinen Sitzplatz und meldest dich für Turniere an.</p>
        <ul className="ov-checks">
          <li>
            <Icon name="check" size={18} /> Sitzplatz direkt im Saalplan wählen
          </li>
          <li>
            <Icon name="check" size={18} /> Für Turniere anmelden und Teams bilden
          </li>
        </ul>
        <div className="ov-card__actions">
          <Link to="/registrieren" className="btn btn--primary">
            Account erstellen
          </Link>
          <Link to="/login" className="btn btn--outline">
            Anmelden
          </Link>
        </div>
      </div>
    );
  }
  const data = my.data;
  return (
    <div className="card ov-card">
      <div className="card-head">
        <h2 className="card-title">Mein Profil</h2>
        <Link to="/profil" className="small">
          Bearbeiten
        </Link>
      </div>
      <div className="ov-profile">
        <Avatar nickname={me.data.nickname} size="md" />
        <div>
          <div className="ov-profile__name">{me.data.nickname}</div>
          {data && data.lanCount > 1 && <div className="small muted">Dabei seit {data.lanCount} LANs</div>}
        </div>
      </div>
      <dl className="ov-facts">
        <div>
          <dt>Sitzplatz</dt>
          <dd className="mono" style={{ color: data?.seat ? 'var(--green-text)' : undefined }}>
            {data?.seat ?? (data?.seatPending ? `${data.seatPending} (angefragt)` : '–')}
          </dd>
        </div>
        <div>
          <dt>Check-in</dt>
          <dd style={{ color: data?.checkedIn ? 'var(--green-text)' : undefined }}>{data?.checkedIn ? '✓ Erledigt' : 'Offen'}</dd>
        </div>
        <div>
          <dt>Bezahlt</dt>
          <dd style={{ color: data?.paid ? 'var(--green-text)' : 'var(--orange)' }}>{data?.paid ? 'Ja' : 'Offen'}</dd>
        </div>
        <div>
          <dt>Turniere</dt>
          <dd>{data && data.tournaments.length > 0 ? data.tournaments.map((t) => t.name).join(', ') : '–'}</dd>
        </div>
      </dl>
    </div>
  );
}

function TeamspeakCard() {
  const { data } = useEventInfo();
  const n = data?.event.network;
  if (!n?.tsAddress) return null;
  const port = n.tsPort ?? 9987;
  const link = `ts3server://${n.tsAddress}?port=${port}${n.tsPassword ? `&password=${encodeURIComponent(n.tsPassword)}` : ''}`;
  return (
    <div className="card ov-card">
      <div className="ov-card__head">
        <span className="card-icon card-icon--blue">
          <Icon name="headset" size={22} />
        </span>
        <h2 className="card-title">Teamspeak</h2>
      </div>
      <div className="stack-sm">
        <div className="copy-row">
          <span className="copy-row__k">Adresse</span>
          <code className="copy-row__v">{n.tsAddress}</code>
          <CopyButton value={n.tsAddress} label="Adresse kopieren" />
        </div>
        <div className="copy-row">
          <span className="copy-row__k">Port</span>
          <code className="copy-row__v">{port}</code>
        </div>
        {n.tsPassword && (
          <div className="copy-row">
            <span className="copy-row__k">Passwort</span>
            <code className="copy-row__v">{n.tsPassword}</code>
            <CopyButton value={n.tsPassword} label="Passwort kopieren" />
          </div>
        )}
      </div>
      <a href={link} className="btn btn--blue">
        Direkt verbinden
      </a>
    </div>
  );
}

function NetworkCard() {
  const { data } = useEventInfo();
  const event = data?.event;
  const n = event?.network;
  if (!n || (!n.wifiSsid && !n.lanSubnet && !n.lanGateway && !n.lanIpMode)) return null;
  return (
    <div id="netzwerk" className="card ov-card ov-network">
      <div className="ov-card__head">
        <span className="card-icon card-icon--green">
          <Icon name="wifi" size={22} />
        </span>
        <h2 className="card-title">
          <AccentText text={heading(event, 'network')} />
        </h2>
      </div>
      {n.wifiSsid && (
        <>
          <div className="ov-wifi">
            <QrCode
              text={wifiPayload(n.wifiSsid, n.wifiPassword, n.wifiSecurity, n.wifiHidden)}
              label={`QR-Code zum Verbinden mit dem WLAN ${n.wifiSsid}`}
              className="ov-wifi__qr"
            />
            <dl className="ov-wifi__facts">
              <div>
                <dt>SSID</dt>
                <dd className="mono">{n.wifiSsid}</dd>
              </div>
              {n.wifiSecurity !== 'OPEN' && n.wifiPassword && (
                <div>
                  <dt>Passwort</dt>
                  <dd className="mono">{n.wifiPassword}</dd>
                </div>
              )}
              <div>
                <dt>Sicherheit</dt>
                <dd>{n.wifiSecurity === 'OPEN' ? 'Offen' : n.wifiSecurity === 'WPA3' ? 'WPA3' : 'WPA2/WPA3'}</dd>
              </div>
            </dl>
          </div>
          <p className="small muted no-margin">QR-Code mit der Handykamera scannen, um dich direkt zu verbinden.</p>
        </>
      )}
      {(n.lanIpMode || n.lanSubnet || n.lanGateway) && (
        <div className="ov-lan">
          <h3 className="ov-lan__title">LAN-Kabel</h3>
          <dl className="ov-lan__grid">
            {n.lanIpMode && (
              <>
                <dt>IP-Vergabe</dt>
                <dd>{n.lanIpMode}</dd>
              </>
            )}
            {n.lanSubnet && (
              <>
                <dt>Subnetz</dt>
                <dd className="mono">{n.lanSubnet}</dd>
              </>
            )}
            {n.lanGateway && (
              <>
                <dt>Gateway / DNS</dt>
                <dd className="mono">{n.lanGateway}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

function InfosCard() {
  const { data } = useEventInfo();
  const infos = data?.infos ?? [];
  if (infos.length === 0) return null;
  return (
    <div className="card ov-card">
      <h2 className="card-title">Gut zu wissen</h2>
      <dl className="ov-infos">
        {infos.map((info, i) => (
          <div key={i}>
            <dt>{info.label}</dt>
            <dd>{info.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------- servers

function ServersSection({ compact = false }: { compact?: boolean }) {
  const { data } = useServers();
  const { data: info } = useEventInfo();
  const timeZone = info?.event.timezone ?? 'Europe/Zurich';
  if (!data || data.length === 0) return null;
  if (compact) {
    const ts = info?.event.network;
    return (
      <section className="card ov-servers-compact">
        <h2 className="h">
          <AccentText text={heading(info?.event, 'servers')} />
        </h2>
        <ul className="srv">
          {ts?.tsAddress && (
            <li className="srv__item">
              <span className="dot" style={{ background: 'var(--blue)' }} />
              <span className="srv__name">Teamspeak</span>
              <span className="mono srv__addr">
                {ts.tsAddress}
                {ts.tsPort && ts.tsPort !== 9987 ? `:${ts.tsPort}` : ''}
              </span>
              <span className="mono srv__players">{ts.tsPassword ? `PW ${ts.tsPassword}` : ''}</span>
            </li>
          )}
          {data.map((s) => (
            <li key={s.id} className="srv__item">
              <span className="dot" style={{ background: s.online ? 'var(--green)' : 'var(--grey)' }} />
              <span className="srv__name">{s.name}</span>
              <span className="mono srv__addr">{s.address}</span>
              <span className="mono srv__players">{players(s, timeZone)}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section aria-labelledby="server" className="ov-section">
      <SectionHead id="server" eyebrow="SERVER" title={heading(info?.event, 'servers')}>
        <span className="small muted">Status wird automatisch aktualisiert</span>
      </SectionHead>
      <div className="card ov-table-card">
        <table className="ov-table">
          <thead>
            <tr>
              <th scope="col">SERVER</th>
              <th scope="col">ADRESSE</th>
              <th scope="col">SPIELER</th>
              <th scope="col">STATUS</th>
              <th scope="col">
                <span className="sr-only">Aktion</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <ServerRow key={s.id} server={s} timeZone={timeZone} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function players(s: PublicServer, timeZone: string) {
  if (s.availableFrom) return `ab ${formatTime(s.availableFrom, timeZone)}`;
  if (s.players != null) return `${s.players}/${s.maxPlayers ?? '?'}`;
  return s.online ? '' : 'offline';
}

function ServerRow({ server, timeZone }: { server: PublicServer; timeZone: string }) {
  const fill = server.players != null && server.maxPlayers ? Math.min(100, Math.round((server.players / server.maxPlayers) * 100)) : 0;
  const full = server.players != null && server.maxPlayers != null && server.players >= server.maxPlayers;
  const status = server.availableFrom ? 'Bald' : !server.online ? 'Offline' : full ? 'Voll' : 'Online';
  const chip = server.availableFrom ? 'chip--plan' : !server.online ? 'chip--bad' : full ? 'chip--warn' : 'chip--live';
  return (
    <tr>
      <td>
        <div className="ov-table__name">{server.name}</div>
        {server.map && <div className="small muted">{server.map}</div>}
      </td>
      <td>
        {server.connectUrl ? (
          <a href={server.connectUrl} className="mono ov-table__addr">
            {server.address}
          </a>
        ) : (
          <code className="ov-table__addr">{server.address}</code>
        )}
      </td>
      <td>
        <div className="ov-players">
          <span className="mono">{players(server, timeZone)}</span>
          {server.maxPlayers ? (
            <span className="bar ov-players__bar">
              <span style={{ width: `${fill}%`, background: 'var(--blue)' }} />
            </span>
          ) : null}
        </div>
      </td>
      <td>
        <span className={'chip ' + chip}>
          <span className="dot dot--sm" style={{ background: 'currentColor' }} />
          {status}
        </span>
      </td>
      <td className="ov-table__action">
        <CopyButton value={server.address} label={`IP von ${server.name} kopieren`} text="IP kopieren" />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------- schedule

function ScheduleSection({ compact = false }: { compact?: boolean }) {
  const { data } = useSchedule();
  const { data: info } = useEventInfo();
  const { kiosk } = useLayout();
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? data?.currentDay ?? data?.days[0]?.key ?? null;
  const items = useMemo(() => data?.days.find((d) => d.key === day)?.items ?? [], [data, day]);
  const liveRef = useRef<HTMLLIElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const timeZone = info?.event.timezone ?? 'Europe/Zurich';

  // On the beamer, keep the running item in view when the list is longer than the card.
  // (scrollIntoView would also scroll the locked kiosk page, so only the list itself is moved.)
  useEffect(() => {
    const list = listRef.current;
    const row = liveRef.current;
    if (!kiosk || !list || !row) return;
    list.scrollTo({ top: row.offsetTop - list.offsetTop - list.clientHeight / 2 + row.clientHeight / 2, behavior: 'smooth' });
  }, [kiosk, items]);

  const tabs = data && data.days.length > 1 && (
    <div role="tablist" aria-label="Tag wählen" className="segmented">
      {data.days.map((d) => (
        <button key={d.key} role="tab" aria-selected={d.key === day} className={'segmented__btn' + (d.key === day ? ' is-on' : '')} onClick={() => setPicked(d.key)}>
          {d.label}
        </button>
      ))}
    </div>
  );

  const list = (
    <ol className="ov-sched" ref={listRef}>
      {items.length === 0 && <li className="empty">Für diesen Tag ist nichts geplant.</li>}
      {items.map((item) => (
        <ScheduleRow key={item.id} item={item} timeZone={timeZone} rowRef={item.status === 'LIVE' ? liveRef : undefined} />
      ))}
    </ol>
  );

  if (compact) {
    return (
      <section className="card ov-sched-card">
        <div className="card-head">
          <h2 className="h">
            <AccentText text={heading(info?.event, 'schedule')} />
          </h2>
          {tabs}
        </div>
        {list}
      </section>
    );
  }
  return (
    <section id="programm" aria-labelledby="programm-h" className="ov-section">
      <SectionHead id="programm-h" eyebrow="TIMETABLE" title={heading(info?.event, 'schedule')}>
        {tabs}
      </SectionHead>
      <div className="ov-legend small muted">
        <span>
          <span className="ov-legend__box" style={{ background: 'var(--purple)' }} />
          Turnier
        </span>
        <span>
          <span className="ov-legend__box" style={{ background: 'var(--green)' }} />
          Programmpunkt
        </span>
      </div>
      <div className="card ov-table-card">{list}</div>
    </section>
  );
}

function ScheduleRow({ item, timeZone, rowRef }: { item: ScheduleEntry; timeZone: string; rowRef?: Ref<HTMLLIElement> }) {
  const tournament = item.tournamentId != null;
  return (
    <li ref={rowRef} className={`ov-sched__row ov-sched__row--${item.status.toLowerCase()}`}>
      <span className="mono ov-sched__time">{item.time || formatTime(item.startsAt, timeZone)}</span>
      <span className="ov-sched__dot" style={{ background: item.color }} />
      <div className="ov-sched__main">
        <div className="ov-sched__title">{item.title}</div>
        {item.location && <div className="small muted">{item.location}</div>}
      </div>
      <div className="ov-sched__tags">
        {item.status === 'LIVE' && <span className="chip chip--solid-live">LIVE</span>}
        {item.status === 'DONE' ? (
          <span className="chip chip--done">Beendet</span>
        ) : (
          <span className={'chip ' + (tournament ? 'chip--purple' : 'chip--live')}>{tournament ? 'Turnier' : 'Programm'}</span>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- tournaments

export const TOURNAMENT_CHIP: Record<TournamentStatusKind, string> = {
  LIVE: 'chip--live',
  OPEN: 'chip--next',
  PLANNED: 'chip--plan',
  CLOSED: 'chip--warn',
  DONE: 'chip--done',
};

function TournamentsSection() {
  const { data } = useTournaments();
  const { data: info } = useEventInfo();
  if (!data || data.length === 0) return null;
  return (
    <section aria-labelledby="turniere-h" className="ov-section">
      <SectionHead id="turniere-h" eyebrow="COMPETE" title={heading(info?.event, 'tournaments')}>
        <Link to="/turniere">Alle Turnierbäume ansehen</Link>
      </SectionHead>
      <div className="ov-tournaments">
        {data.map((t) => (
          <TournamentCard key={t.id} t={t} timeZone={info?.event.timezone ?? 'Europe/Zurich'} />
        ))}
      </div>
    </section>
  );
}

function TournamentCard({ t, timeZone }: { t: TournamentSummary; timeZone: string }) {
  return (
    <Link to={`/turniere?t=${t.id}`} className="card ov-tournament">
      <div className="ov-tournament__top">
        <span className={'chip ' + TOURNAMENT_CHIP[t.statusKind]}>{t.statusText}</span>
      </div>
      <div className="ov-tournament__name">
        <span className="dot" style={{ background: t.color }} />
        {t.name}
      </div>
      {t.formatLabel && <div className="small muted ov-tournament__format">{t.formatLabel}</div>}
      <div className="ov-tournament__meta">
        <span>
          {t.registered}/{t.maxParticipants} {t.teamSize > 1 ? 'Teams' : 'Spieler'}
        </span>
        <span>{t.startsAt ? formatDateTime(t.startsAt, timeZone) : ''}</span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- seating

function SeatingTeaser({ compact = false }: { compact?: boolean }) {
  const { data } = useSeats();
  const { data: info } = useEventInfo();
  const me = useMe();
  const my = useMyEvent(!!me.data);
  if (!data || data.total === 0) return null;
  const capacity = data.total - data.blocked;
  if (compact) {
    return (
      <section className="card ov-seat-compact">
        <div className="card-head">
          <h2 className="h">
            <AccentText text={heading(info?.event, 'seating')} />
          </h2>
          <span className="mono small">
            {data.taken}/{capacity} belegt
          </span>
        </div>
        <SeatMap map={data} compact />
      </section>
    );
  }
  return (
    <section aria-labelledby="sitzplan-h" className="card ov-seating">
      <div className="ov-seating__text">
        <SectionHead id="sitzplan-h" eyebrow="SITZPLAN" title={heading(info?.event, 'seating')} />
        <p className="muted no-margin">
          Finde deine Freunde im Saal oder wechsle deinen Platz, solange noch Plätze frei sind. Dein Platz ist grün markiert. Aktuell sind{' '}
          <strong>
            {data.taken} von {capacity}
          </strong>{' '}
          Plätzen belegt.
        </p>
        <SeatLegend withMine />
        <Link to="/sitzplan" className="btn btn--primary align-start">
          Zum Sitzplan
        </Link>
      </div>
      <div className="ov-seating__map">
        <SeatMap map={data} compact mine={my.data?.seat} />
      </div>
    </section>
  );
}
