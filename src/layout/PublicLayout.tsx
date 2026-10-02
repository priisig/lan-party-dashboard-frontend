import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useEventInfo } from '../api/queries';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { AnnouncementBar } from './AnnouncementBar';
import { Clock } from './Clock';
import { LiveTag } from './LiveTag';
import { useLayout } from './TierContext';
import { VIEWS } from './views';
import './layout.css';

export function PublicLayout() {
  const { data, error } = useEventInfo();
  const { tier, kiosk } = useLayout();
  const event = data?.event;
  const timeZone = event?.timezone ?? 'Europe/Zurich';
  useDocumentTitle(event?.title);

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
        <Link to="/" className="header__brand">
          <Logo src={event?.logoUrl} className="header__logo" />
          <div className="header__titles">
            <h1 className="header__title">{event?.title ?? ' '}</h1>
            {event?.subtitle && <span className="header__subtitle">{event.subtitle}</span>}
          </div>
        </Link>
        {tier !== 'mobile' && (
          <nav aria-label="Ansichten" className="header__nav">
            {VIEWS.map((v) => (
              <NavLink key={v.key} to={v.path} end className="tab">
                {v.label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="header__right">
          {tier !== 'mobile' && <LiveTag />}
          <Clock timeZone={timeZone} />
          {!kiosk && (
            <Link to="/admin" className="tab header__admin" aria-label="Admin-Bereich">
              <Icon name="lock" size="1.375rem" />
            </Link>
          )}
        </div>
      </header>
      {kiosk && event && <KioskRotation views={event.kioskViews} intervalSec={event.kioskIntervalSec} />}
      {tier === 'mobile' && (
        <div className="mobile-live">
          <LiveTag />
        </div>
      )}
      <AnnouncementBar />
      <Outlet />
      {tier === 'mobile' && (
        <nav aria-label="Ansichten" className="bottom-nav">
          {VIEWS.map((v) => (
            <NavLink key={v.key} to={v.path} end className="bottom-nav__item">
              <Icon name={v.icon} size="1.5rem" />
              <span>{v.short}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
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
