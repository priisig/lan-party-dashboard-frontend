import { type FormEvent, useState } from 'react';
import { errorMessage } from '../api/client';
import type { EventView } from '../api/types';
import { formatDateTime } from '../lib/time';
import { useEventMutations, useEvents } from './adminApi';
import { useToast } from './Toast';
import { DateTimeInput } from './sections/common';

const TZ = 'Europe/Zurich';

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** One event per LAN edition. Cloning carries the setup over to next year. */
export function EventsPage({ firstRun = false, onCreated }: { firstRun?: boolean; onCreated: (id: number) => void }) {
  const events = useEvents().data ?? [];
  const m = useEventMutations();
  const toast = useToast();

  return (
    <main className="admin-main admin-main--narrow">
      <section className="card admin-section">
        <h2 className="h">{firstRun ? 'Willkommen! Lege den ersten Event an' : 'Events'}</h2>
        {!firstRun && (
          <p className="small muted no-margin">
            Jede LAN ist ein eigener Event. Für nächstes Jahr: neuen Event als Kopie anlegen (Infos, Server, Turniere, Integrationen, Sitzplan und Zeitplan werden übernommen und
            zeitlich verschoben), vorbereiten und am LAN-Tag aktivieren.
          </p>
        )}
        {events.length > 0 && (
          <ul className="event-list">
            {events.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                onActivate={() => m.activate.mutate(e.id, { onSuccess: () => toast(`${e.title} ist jetzt aktiv`), onError: (err) => toast(errorMessage(err), 'error') })}
                onDelete={() =>
                  window.confirm(`${e.title} mit allen Daten löschen? Das kann nicht rückgängig gemacht werden.`) &&
                  m.remove.mutate(e.id, { onError: (err) => toast(errorMessage(err), 'error') })
                }
                onEdit={() => onCreated(e.id)}
              />
            ))}
          </ul>
        )}
      </section>
      <CreateEvent events={events} firstRun={firstRun} onCreated={onCreated} />
    </main>
  );
}

function EventRow({ event, onActivate, onDelete, onEdit }: { event: EventView; onActivate: () => void; onDelete: () => void; onEdit: () => void }) {
  return (
    <li className="event-list__item">
      <div className="event-list__text">
        <strong>
          {event.title} {event.active && <span className="chip chip--live">aktiv</span>}
        </strong>
        <span className="small muted mono">
          {formatDateTime(event.startsAt, event.timezone)} – {formatDateTime(event.endsAt, event.timezone)}
        </span>
      </div>
      <div className="row-actions wrap">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
          Bearbeiten
        </button>
        {!event.active && (
          <>
            <button type="button" className="btn btn--ok btn--sm" onClick={onActivate}>
              Aktivieren
            </button>
            <button type="button" className="btn btn--danger btn--sm" onClick={onDelete}>
              Löschen
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function CreateEvent({ events, firstRun, onCreated }: { events: EventView[]; firstRun: boolean; onCreated: (id: number) => void }) {
  const m = useEventMutations();
  const toast = useToast();
  const latest = events[0];
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [cloneFrom, setCloneFrom] = useState<number | null>(latest?.id ?? null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!startsAt || !endsAt) return;
    m.create.mutate(
      { title, slug: slug || slugify(title), startsAt, endsAt, cloneFromId: cloneFrom },
      {
        onSuccess: async (created) => {
          toast(`${created.title} angelegt`);
          if (firstRun) await m.activate.mutateAsync(created.id);
          onCreated(created.id);
          setTitle('');
          setSlug('');
          setSlugTouched(false);
        },
        onError: (err) => toast(errorMessage(err), 'error'),
      },
    );
  };

  return (
    <form className="card admin-section" onSubmit={submit}>
      <h2 className="h">{firstRun ? 'Event' : 'Neuer Event'}</h2>
      <div className="form-grid">
        <label className="lbl">
          Titel
          <input
            className="in"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="VIVO LAN 2027"
          />
        </label>
        <label className="lbl">
          Kürzel (URL-sicher)
          <input
            className="in mono"
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="vivo-lan-2027"
          />
        </label>
        <label className="lbl">
          Beginn
          <DateTimeInput value={startsAt} onChange={setStartsAt} timeZone={latest?.timezone ?? TZ} required />
        </label>
        <label className="lbl">
          Ende
          <DateTimeInput value={endsAt} onChange={setEndsAt} timeZone={latest?.timezone ?? TZ} required />
        </label>
      </div>
      {events.length > 0 && (
        <label className="lbl">
          Einrichtung übernehmen von
          <select className="in" value={cloneFrom ?? ''} onChange={(e) => setCloneFrom(e.target.value ? Number(e.target.value) : null)}>
            <option value="">– leer starten –</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="submit" className="btn btn--primary align-start" disabled={m.create.isPending}>
        {firstRun ? 'Event anlegen & aktivieren' : 'Event anlegen'}
      </button>
    </form>
  );
}
