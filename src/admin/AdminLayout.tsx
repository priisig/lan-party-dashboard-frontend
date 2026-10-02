import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useLogout } from '../api/auth';
import { AccentText } from '../components/AccentText';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { useLayout } from '../layout/TierContext';
import { useAdmin } from './AdminContext';

/** Sections of the admin page (anchors) plus the separate pages; the dot colour groups them. */
export const SECTIONS: { id: string; label: string; dot: string; to?: string }[] = [
  { id: 'uebersicht', label: 'Übersicht', dot: 'var(--purple)' },
  { id: 'ankuendigungen', label: 'Ankündigungen', dot: 'var(--green)' },
  { id: 'inhalte', label: 'Inhalte & Willkommen', dot: 'var(--blue)' },
  { id: 'timetable', label: 'Timetable', dot: 'var(--purple)' },
  { id: 'turniere', label: 'Turniere', dot: 'var(--purple)' },
  { id: 'sitzplan', label: 'Sitzplan', dot: 'var(--green)' },
  { id: 'sitzordnung', label: 'Saalplan-Editor', dot: 'var(--green)', to: '/admin/sitzordnung' },
  { id: 'server', label: 'Server & Teamspeak', dot: 'var(--blue)' },
  { id: 'netzwerk', label: 'Netzwerk & QR', dot: 'var(--blue)' },
  { id: 'teilnehmer', label: 'Teilnehmer', dot: 'var(--green)' },
  { id: 'integrationen', label: 'Integrationen', dot: 'var(--blue)' },
  { id: 'einstellungen', label: 'Einstellungen', dot: 'var(--grey)' },
  { id: 'events', label: 'Events', dot: 'var(--grey)', to: '/admin/events' },
];

export function AdminLayout() {
  const { me, event, events, selectEvent } = useAdmin();
  const { tier } = useLayout();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const drawer = tier === 'mobile';

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  const sidebar = (
    <aside className={'admin-side' + (drawer ? ' admin-side--drawer' : '') + (open ? ' is-open' : '')}>
      <div className="admin-side__brand">
        <Link to="/" className="admin-side__home">
          <Logo src={event.logoUrl} className="admin-side__logo" />
          <span className="admin-side__titles">
            <span className="admin-side__title">
              <AccentText text={event.title} />
            </span>
            <span className="admin-side__badge">ADMIN</span>
          </span>
        </Link>
        {drawer && (
          <button className="ico admin-side__close" aria-label="Menü schliessen" onClick={() => setOpen(false)}>
            <Icon name="close" />
          </button>
        )}
      </div>
      <label className="lbl admin-side__event">
        Bearbeiteter Event
        <select className="in" value={event.id} onChange={(e) => selectEvent(Number(e.target.value))}>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title.replace(/\{[a-z]+:([^{}]+)\}/g, '$1')}
              {ev.active ? ' (aktiv)' : ''}
            </option>
          ))}
        </select>
      </label>
      {!event.active && <div className="admin-side__inactive">Dieser Event ist nicht aktiv – Änderungen sind auf der Webseite noch nicht sichtbar.</div>}
      <nav aria-label="Admin-Navigation" className="admin-side__nav">
        {SECTIONS.map((s) =>
          s.to ? (
            <NavLink key={s.id} to={s.to} className="side">
              <span className="side__dot" style={{ background: s.dot }} />
              {s.label}
            </NavLink>
          ) : (
            <Link
              key={s.id}
              to={`/admin#${s.id}`}
              className={'side' + (location.pathname === '/admin' && (location.hash === '#' + s.id || (!location.hash && s.id === 'uebersicht')) ? ' active' : '')}
            >
              <span className="side__dot" style={{ background: s.dot }} />
              {s.label}
            </Link>
          ),
        )}
      </nav>
      <div className="admin-side__footer">
        <span className="small muted">Angemeldet als</span>
        <strong>{me.nickname}</strong>
        <Link to="/" className="small">
          Zur Webseite
        </Link>
        <button type="button" className="link-btn align-start" onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/') })}>
          Abmelden
        </button>
      </div>
    </aside>
  );

  return (
    <div className="admin-shell">
      {drawer && (
        <header className="admin-topbar">
          <button className="ico" aria-label="Menü öffnen" aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <span className="admin-topbar__title">
            <AccentText text={event.title} />
          </span>
          <span className="admin-side__badge">ADMIN</span>
        </header>
      )}
      {sidebar}
      {drawer && open && <div className="admin-scrim" onClick={() => setOpen(false)} />}
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}

/** Sticky title bar on top of each admin page. */
export function AdminTopBar({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="admin-bar">
      <div className="admin-bar__titles">
        <h1 className="admin-bar__title">{title}</h1>
        {subtitle && <div className="small muted">{subtitle}</div>}
      </div>
      <div className="admin-bar__actions">{children}</div>
    </div>
  );
}
