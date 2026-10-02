import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { AdminsSection } from './sections/AdminsSection';
import { AnnouncementSection } from './sections/AnnouncementSection';
import { GeneralSection } from './sections/GeneralSection';
import { IntegrationsSection } from './sections/IntegrationsSection';
import { ScheduleSection } from './sections/ScheduleSection';
import { ServersSection } from './sections/ServersSection';
import { TournamentsSection } from './sections/TournamentsSection';
import { useAdmin } from './AdminContext';

export function AdminPage() {
  const { event } = useAdmin();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  // Remount sections when switching events so drafts never leak between events.
  return (
    <main className="admin-main" key={event.id}>
      <div className="admin-col">
        <GeneralSection />
        <AnnouncementSection />
      </div>
      <div className="admin-col">
        <ServersSection />
        <ScheduleSection />
      </div>
      <div className="admin-col">
        <TournamentsSection />
        <IntegrationsSection />
        <AdminsSection />
      </div>
    </main>
  );
}
