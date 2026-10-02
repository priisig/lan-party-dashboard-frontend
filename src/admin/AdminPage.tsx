import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAdmin } from './AdminContext';
import { AdminTopBar } from './AdminLayout';
import { useOverview } from './adminApi';
import { AnnouncementSection } from './sections/AnnouncementSection';
import { GeneralSection } from './sections/GeneralSection';
import { IntegrationsSection, SettingsSection } from './sections/IntegrationsSection';
import { NetworkSection, TeamspeakSection } from './sections/NetworkSection';
import { ParticipantsSection } from './sections/ParticipantsSection';
import { ScheduleSection } from './sections/ScheduleSection';
import { SeatingSettingsSection } from './sections/SeatingSettingsSection';
import { ServersSection } from './sections/ServersSection';
import { TournamentsSection } from './sections/TournamentsSection';

/** One scrollable admin panel: KPI row, then all sections as cards; the sidebar jumps to them. */
export function AdminPage() {
  const { event } = useAdmin();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  // Remount sections when switching events so drafts never leak between events.
  return (
    <main className="admin-main" key={event.id}>
      <AdminTopBar title="Übersicht" subtitle={event.active ? 'Aktiver Event – Änderungen sind sofort auf der Webseite sichtbar' : 'Event in Vorbereitung (nicht aktiv)'}>
        <a href="/" target="_blank" rel="noreferrer" className="btn btn--outline btn--sm">
          Webseite ansehen
        </a>
        <a href="/?kiosk=1" target="_blank" rel="noreferrer" className="btn btn--outline btn--sm">
          Beamer-Ansicht
        </a>
      </AdminTopBar>
      <Kpis />
      <div className="admin-grid">
        <AnnouncementSection />
        <GeneralSection />
        <ScheduleSection />
        <TournamentsSection />
        <SeatingSettingsSection />
        <ServersSection />
        <TeamspeakSection />
        <NetworkSection />
        <ParticipantsSection />
        <IntegrationsSection />
        <SettingsSection />
      </div>
    </main>
  );
}

function Kpis() {
  const { event } = useAdmin();
  const { data } = useOverview(event.id);
  const kpi = (label: string, value: number | undefined, color?: string, of?: number) => (
    <div className="admin-kpi">
      <div className="admin-kpi__k">{label}</div>
      <div className="admin-kpi__v" style={{ color }}>
        {value ?? '–'}
        {of != null && <small>/{of}</small>}
      </div>
    </div>
  );
  return (
    <section id="uebersicht" aria-label="Kennzahlen" className="admin-kpis">
      {kpi('Plätze belegt', data?.seatsTaken, undefined, data?.seatsCapacity)}
      {kpi('Teilnehmer', data?.participants)}
      {kpi('Eingecheckt', data?.checkedIn, 'var(--green)')}
      {kpi('Zahlung offen', data?.paymentOpen, 'var(--orange)')}
      {kpi('Offene Platzanfragen', data?.pendingRequests, data?.pendingRequests ? 'var(--orange)' : undefined)}
      {kpi('Turniere live', data?.liveTournaments, 'var(--purple)')}
      {kpi('Server online', data?.serversOnline, 'var(--blue)', data?.serversTotal)}
    </section>
  );
}
