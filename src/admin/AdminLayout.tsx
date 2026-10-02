import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { useLayout } from '../layout/TierContext';
import { useAdmin } from './AdminContext';
import { useLogout } from './adminApi';

export const SECTIONS = [
  { id: 'allgemein', label: 'Allgemein' },
  { id: 'durchsage', label: 'Durchsage' },
  { id: 'server', label: 'Game Server' },
  { id: 'zeitplan', label: 'Zeitplan' },
  { id: 'turniere', label: 'Turniere' },
  { id: 'integrationen', label: 'Integrationen' },
  { id: 'admins', label: 'Admins' },
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
        <Logo src={event.logoUrl} className="admin-side__logo" />
        <div className="admin-side__titles">
          <span className="admin-side__title">{event.title}</span>
          <span className="admin-badge">ADMIN</span>
        </div>
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
              {ev.title}
              {ev.active ? ' (aktiv)' : ''}
            </option>
          ))}
        </select>
      </label>
      {!event.active && <div className="admin-side__inactive">Dieser Event ist nicht aktiv – Änderungen sind auf dem Dashboard noch nicht sichtbar.</div>}
      <nav aria-label="Admin" className="admin-side__nav">
        {SECTIONS.slice(0, 5).map((s) => (
          <Link key={s.id} to={`/admin#${s.id}`} className={'side' + (location.pathname === '/admin' && location.hash === '#' + s.id ? ' active' : '')}>
            {s.label}
          </Link>
        ))}
        <NavLink to="/admin/sitzordnung" className="side">
          Sitzordnung
        </NavLink>
        {SECTIONS.slice(5).map((s) => (
          <Link key={s.id} to={`/admin#${s.id}`} className={'side' + (location.pathname === '/admin' && location.hash === '#' + s.id ? ' active' : '')}>
            {s.label}
          </Link>
        ))}
        <NavLink to="/admin/events" className="side">
          Events
        </NavLink>
      </nav>
      <div className="admin-side__footer">
        <span className="small muted">
          Eingeloggt als <strong style={{ color: 'var(--text)' }}>{me.name}</strong>
        </span>
        <a href="/" target="_blank" rel="noreferrer" className="btn btn--ghost">
          Dashboard ansehen <Icon name="external" size={16} />
        </a>
        <button className="btn btn--ghost" onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/admin/login') })}>
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
          <span className="admin-topbar__title">{event.title}</span>
          <span className="admin-badge">ADMIN</span>
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
