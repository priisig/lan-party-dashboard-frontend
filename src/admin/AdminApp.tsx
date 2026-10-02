import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { useMe } from '../api/auth';
import type { Me } from '../api/types';
import { AdminContext } from './AdminContext';
import { useEvents } from './adminApi';
import { AdminLayout } from './AdminLayout';
import { AdminPage } from './AdminPage';
import { AdminSeatingPage } from './AdminSeatingPage';
import { EventsPage } from './EventsPage';
import { ToastProvider } from './Toast';
import './admin.css';

const SELECTED_KEY = 'lan-dashboard.admin.event';

export default function AdminApp() {
  return (
    <ToastProvider>
      <Protected />
    </ToastProvider>
  );
}

/** Organisers only: visitors go to the login, participants see a short note. */
function Protected() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return null;
  if (me.error) return <div className="admin-error error-box">Backend nicht erreichbar: {me.error.message}</div>;
  if (!me.data) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (me.data.role !== 'ORGA') {
    return (
      <div className="admin-denied">
        <h1 className="display">Kein Zugriff</h1>
        <p className="muted">Der Admin-Bereich ist für das Orga-Team. Dein Account «{me.data.nickname}» hat keine Orga-Rolle.</p>
        <Link to="/" className="btn btn--primary">
          Zur Übersicht
        </Link>
      </div>
    );
  }
  return <WithEvents me={me.data} />;
}

function readSelected(): number | null {
  try {
    return Number(window.localStorage.getItem(SELECTED_KEY)) || null;
  } catch {
    return null;
  }
}

function WithEvents({ me }: { me: Me }) {
  const events = useEvents();
  const [selected, setSelected] = useState<number | null>(readSelected);

  const list = useMemo(() => events.data ?? [], [events.data]);
  const event = list.find((e) => e.id === selected) ?? list.find((e) => e.active) ?? list[0];

  useEffect(() => {
    try {
      if (selected) window.localStorage.setItem(SELECTED_KEY, String(selected));
    } catch {
      // only a convenience
    }
  }, [selected]);

  if (events.isPending) return null;

  if (!event) {
    // Fresh installation: the only thing to do is creating the first event.
    return (
      <div className="admin-first">
        <EventsPage firstRun onCreated={(id) => setSelected(id)} />
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ me, events: list, event, selectEvent: setSelected }}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminPage />} />
          <Route path="events" element={<EventsPage onCreated={(id) => setSelected(id)} />} />
          <Route path="sitzordnung" element={<AdminSeatingPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminContext.Provider>
  );
}
