import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useMe, useMyEvent } from '../api/auth';
import { useEventInfo } from '../api/queries';
import { AccentText } from '../components/AccentText';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { stripAccent } from '../lib/accent';
import { AnnouncementBar } from './AnnouncementBar';
import { Clock } from './Clock';
import { LiveTag } from './LiveTag';
import { useLayout } from './TierContext';
import { NAV_LINKS, VIEWS } from './views';
import './layout.css';

export function PublicLayout() {
  const { data, error } = useEventInfo();
  const { tier, kiosk } = useLayout();
  const event = data?.event;
  const timeZone = event?.timezone ?? 'Europe/Zurich';
  useDocumentTitle(event ? stripAccent(event.title) : undefined);

  if (error && !data) {
    return (
      <div className="no-event">
        <Logo src={null} className="no-event__logo" />
        <h1 className="display">Kein aktiver Event</h1>
        <p className="muted">{error.message}</p>
        <Link to="/admin" className="btn btn--primary">
          Zum Admin-Bereich
        </Link>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="header">
        <div className="header__inner">
          <Link to="/" className="header__brand">
            <Logo src={event?.logoUrl} className="header__logo" />
            <span className="header__title">{event ? <AccentText text={event.title} /> : ' '}</span>
          </Link>
          {tier !== 'mobile' && (
            <nav aria-label="Hauptnavigation" className="header__nav">
              {NAV_LINKS.map((v) => (
                <NavItem key={v.label} to={v.to} label={v.label} />
              ))}
            </nav>
          )}
          <div className="header__right">
            {tier !== 'mobile' && <LiveTag />}
            {kiosk ? <Clock timeZone={timeZone} /> : <AccountPill compact={tier === 'mobile'} />}
          </div>
        </div>
      </header>
      {kiosk && event && <KioskRotation views={event.kioskViews} intervalSec={event.kioskIntervalSec} />}
      {tier === 'mobile' && (
        <div className="mobile-live">
          <LiveTag />
        </div>
      )}
      <AnnouncementBar dismissible={!kiosk} />
      <Outlet />
      {!kiosk && <Footer />}
      {tier === 'mobile' && (
        <nav aria-label="Ansichten" className="bottom-nav">
          {VIEWS.map((v) => (
            <NavLink key={v.key} to={v.path} end className="bottom-nav__item">
              <Icon name={v.icon} size="1.5rem" />
              <span>{v.short}</span>
            </NavLink>
          ))}
          <ProfileTab />
        </nav>
      )}
    </div>
  );
}

/** Nav link that also handles "/#programm" style anchors on the overview. */
function NavItem({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  if (to.includes('#')) {
    const hash = to.slice(to.indexOf('#'));
    const active = location.pathname === '/' && location.hash === hash;
    return (
      <Link to={to} className={'tab' + (active ? ' active' : '')}>
        {label}
      </Link>
    );
  }
  const exactOverview = to === '/' && location.hash !== '';
  return (
    <NavLink to={to} end className={({ isActive }) => 'tab' + (isActive && !exactOverview ? ' active' : '')}>
      {label}
    </NavLink>
  );
}

function AccountPill({ compact }: { compact: boolean }) {
  const me = useMe();
  const my = useMyEvent(!!me.data);
  if (me.isPending) return <span className="account-pill account-pill--placeholder" />;
  if (!me.data) {
    return (
      <Link to="/login" className="btn btn--primary btn--sm">
        Anmelden
      </Link>
    );
  }
  const seat = my.data?.seat;
  return (
    <Link to="/profil" className="account-pill" aria-label={`Profil von ${me.data.nickname}`}>
      <Avatar nickname={me.data.nickname} />
      {!compact && <span className="account-pill__name">{me.data.nickname}</span>}
      {seat && <span className="account-pill__seat mono">{seat}</span>}
    </Link>
  );
}

function ProfileTab() {
  const me = useMe();
  return (
    <NavLink to={me.data ? '/profil' : '/login'} className="bottom-nav__item">
      <Icon name="user" size="1.5rem" />
      <span>{me.data ? 'Profil' : 'Login'}</span>
    </NavLink>
  );
}

function Footer() {
  const me = useMe();
  const { data } = useEventInfo();
  const event = data?.event;
  return (
    <footer className="footer">
      <div className="footer__inner">
        <span>{event ? [stripAccent(event.title), event.location].filter(Boolean).join(' · ') : ''}</span>
        {me.data?.role === 'ORGA' && <Link to="/admin">Admin-Bereich</Link>}
      </div>
    </footer>
  );
}

/** Cycles through the configured views on the beamer and shows the time until the next switch. */
function KioskRotation({ views, intervalSec }: { views: string; intervalSec: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const paths = useMemo(() => {
    const wanted = views.split(',').map((v) => v.trim());
    const list = VIEWS.filter((v) => wanted.includes(v.key)).map((v) => v.path);
    return list.length > 0 ? list : ['/'];
  }, [views]);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const index = paths.indexOf(location.pathname);
      navigate(paths[(index + 1) % paths.length]);
      setCycle((c) => c + 1);
    }, intervalSec * 1000);
    return () => window.clearTimeout(id);
  }, [paths, intervalSec, location.pathname, navigate, cycle]);

  return (
    <div className="kiosk-progress" aria-hidden="true">
      <span key={location.pathname + cycle} style={{ animationDuration: `${intervalSec}s` }} />
    </div>
  );
}
