import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { ApiError } from '../api/client';
import { AdminContext } from './AdminContext';
import { useEvents, useMe } from './adminApi';
import { AdminLayout } from './AdminLayout';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminPage } from './AdminPage';
import { AdminSeatingPage } from './AdminSeatingPage';
import { EventsPage } from './EventsPage';
import { ToastProvider } from './Toast';
import './admin.css';

const SELECTED_KEY = 'lan-dashboard.admin.event';

export default function AdminApp() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="*" element={<Protected />} />
      </Routes>
    </ToastProvider>
  );
}

function Protected() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return null;
  if (me.error) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    }
    return <div className="admin-error error-box">Backend nicht erreichbar: {me.error.message}</div>;
  }
  return <WithEvents />;
}

function readSelected(): number | null {
  try {
    return Number(window.localStorage.getItem(SELECTED_KEY)) || null;
  } catch {
    return null;
  }
}

function WithEvents() {
  const me = useMe();
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

  if (!me.data || events.isPending) return null;

  if (!event) {
    // Fresh installation: the only thing to do is creating the first event.
    return (
      <div className="admin-first">
        <EventsPage firstRun onCreated={(id) => setSelected(id)} />
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ me: me.data, events: list, event, selectEvent: setSelected }}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminPage />} />
          <Route path="events" element={<EventsPage onCreated={(id) => setSelected(id)} />} />
        </Route>
        <Route path="sitzordnung" element={<AdminSeatingPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminContext.Provider>
  );
}
