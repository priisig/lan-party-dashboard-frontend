import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMe, useMyEvent, useSeatActions } from '../api/auth';
import { errorMessage } from '../api/client';
import { useEventInfo, useSeats } from '../api/queries';
import type { MyEvent, SeatRulesDto, SeatView } from '../api/types';
import { Icon } from '../components/Icon';
import { SectionHead } from '../components/SectionHead';
import { SeatLegend, SeatMap } from '../components/seatmap/SeatMap';
import { useLayout } from '../layout/TierContext';
import './seating.css';

export function SeatingPage() {
  const { data: map } = useSeats();
  const { data: info } = useEventInfo();
  const { kiosk } = useLayout();
  const me = useMe();
  const my = useMyEvent(!!me.data);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const seats = useMemo(() => map?.rows.flatMap((r) => r.seats) ?? [], [map]);
  const selected = seats.find((s) => s.label === selectedLabel) ?? null;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return seats.filter((s) => s.gamertag?.toLowerCase().includes(q));
  }, [seats, query]);
  const highlighted = useMemo(() => new Set(matches.map((s) => s.label)), [matches]);
  const capacity = map ? map.total - map.blocked : 0;

  const mapCard = (
    <section className="card seating__map" aria-label="Saalplan">
      <div className="card-head">
        <SeatLegend withMine={!!my.data?.seat} />
        {map && (
          <span className="mono small muted">
            {map.taken}/{capacity} belegt
          </span>
        )}
      </div>
      {map ? (
        map.total === 0 ? (
          <p className="empty">Der Sitzplan ist noch nicht eingerichtet.</p>
        ) : (
          <SeatMap
            map={map}
            mine={my.data?.seat}
            selected={selectedLabel}
            highlighted={highlighted}
            onSelect={kiosk ? undefined : (s) => setSelectedLabel(s.label === selectedLabel ? null : s.label)}
          />
        )
      ) : (
        <p className="empty">Lade …</p>
      )}
    </section>
  );

  if (kiosk) {
    return <main className="page seating seating--kiosk">{mapCard}</main>;
  }

  return (
    <main className="site-page seating">
      <SectionHead eyebrow="RESERVATION" title="Sitzplatzwahl" as="h1">
        <label className="seating__search">
          <span className="small muted">Spieler im Saal suchen</span>
          <span className="seating__search-box">
            <Icon name="search" size={18} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nickname eingeben" />
          </span>
        </label>
      </SectionHead>
      <p className="muted no-margin seating__intro">Klicke auf einen freien Platz, um ihn auszuwählen. Fahre über belegte Plätze, um zu sehen, wer dort sitzt.</p>
      {query.trim().length >= 2 && (
        <div className="seat-results" aria-live="polite">
          {matches.length === 0 && <span className="muted">Niemand gefunden.</span>}
          {matches.map((s) => (
            <button key={s.label} className="pill seat-results__btn" onClick={() => setSelectedLabel(s.label)}>
              <strong>{s.gamertag}</strong> <span className="mono muted">→ {s.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="seating__layout">
        {mapCard}
        <aside className="seating__side">
          {me.data ? (
            <>
              <MyReservation my={my.data} />
              {info && <ChangeCard seat={selected} my={my.data} rules={info.event.seatRules} onDone={() => setSelectedLabel(null)} />}
            </>
          ) : (
            <section className="card card--accent">
              <h2 className="card-title">Platz reservieren</h2>
              <p className="muted no-margin">Für die Platzwahl brauchst du einen Account. So sehen deine Freunde, wo du sitzt.</p>
              <Link to="/login?next=/sitzplan" className="btn btn--primary">
                Anmelden, um Platz zu wählen
              </Link>
              <Link to="/registrieren?next=/sitzplan" className="btn btn--outline">
                Account erstellen
              </Link>
            </section>
          )}
          {info?.event.seatRules.info && (
            <section className="card seating__info">
              <h2 className="card-title card-title--sm">Gut zu wissen</h2>
              <p className="muted no-margin">{info.event.seatRules.info}</p>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

function MyReservation({ my }: { my: MyEvent | undefined }) {
  const actions = useSeatActions();
  if (!my) return null;
  if (!my.seat && !my.seatPending) {
    return (
      <section className="card">
        <h2 className="card-title">Meine Reservation</h2>
        <p className="muted no-margin">Du hast noch keinen Platz. Wähle im Saalplan einen freien Platz aus.</p>
      </section>
    );
  }
  return (
    <section className="card">
      <h2 className="card-title">Meine Reservation</h2>
      {my.seat ? (
        <div className="my-seat">
          <span className="my-seat__label">{my.seat}</span>
          <div className="small">
            <div style={{ fontWeight: 600 }}>Dein aktueller Platz</div>
            <div className="muted">{my.paid ? 'Bezahlt' : 'Zahlung offen'} · {my.checkedIn ? 'eingecheckt' : 'noch nicht eingecheckt'}</div>
          </div>
        </div>
      ) : null}
      {my.seatPending && (
        <div className="my-seat my-seat--pending">
          <span className="my-seat__label">{my.seatPending}</span>
          <div className="small">
            <div style={{ fontWeight: 600 }}>Anfrage offen</div>
            <div className="muted">Die Orga bestätigt deine Reservation bald.</div>
          </div>
        </div>
      )}
      {actions.cancel.error && <div className="error-box">{errorMessage(actions.cancel.error)}</div>}
      <button
        type="button"
        className="btn btn--danger btn--sm align-start"
        disabled={actions.cancel.isPending}
        onClick={() => {
          if (window.confirm(my.seat ? `Platz ${my.seat} wirklich freigeben?` : 'Anfrage zurückziehen?')) actions.cancel.mutate();
        }}
      >
        {my.seat ? 'Reservation stornieren' : 'Anfrage zurückziehen'}
      </button>
    </section>
  );
}

function ChangeCard({ seat, my, rules, onDone }: { seat: SeatView | null; my: MyEvent | undefined; rules: SeatRulesDto; onDone: () => void }) {
  const actions = useSeatActions();
  const [companions, setCompanions] = useState('');
  const current = my?.seat ?? null;
  const title = current ? 'Platz wechseln' : 'Platz wählen';

  if (!rules.selectionOpen) {
    return (
      <section className="card">
        <h2 className="card-title">{title}</h2>
        <p className="muted no-margin">Die Platzwahl ist geschlossen. Für Änderungen wende dich an die Orga.</p>
      </section>
    );
  }
  if (current && !rules.changeAllowed) {
    return (
      <section className="card">
        <h2 className="card-title">Platz wechseln</h2>
        <p className="muted no-margin">Platzwechsel sind gerade gesperrt. Für Änderungen wende dich an die Orga.</p>
      </section>
    );
  }
  const free = seat && seat.status === 'FREE' && !seat.pending && seat.label !== current;
  if (!seat || !free) {
    return (
      <section className="card">
        <h2 className="card-title">{title}</h2>
        <p className="muted no-margin">
          {seat && seat.label !== current
            ? `Platz ${seat.label} ist ${seat.status === 'TAKEN' ? `belegt${seat.gamertag ? ' von ' + seat.gamertag : ''}` : seat.status === 'BLOCKED' ? 'für die Orga gesperrt' : 'bereits angefragt'}.`
            : current
              ? 'Wähle im Saalplan einen freien Platz aus, um deine Reservation zu ändern.'
              : 'Wähle im Saalplan einen freien Platz aus.'}
        </p>
      </section>
    );
  }
  return (
    <section className="card card--selected">
      <h2 className="card-title">{title}</h2>
      <div className="seat-change">
        {current && (
          <>
            <span className="mono muted seat-change__old">{current}</span>
            <Icon name="arrow" size={20} />
          </>
        )}
        <span className="seat-change__new">{seat.label}</span>
      </div>
      {rules.approvalRequired && (
        <label className="lbl">
          Mit wem willst du sitzen? (optional)
          <input className="in" maxLength={300} value={companions} onChange={(e) => setCompanions(e.target.value)} placeholder="Team / Kollegen" />
        </label>
      )}
      <p className="small muted no-margin">
        {rules.approvalRequired
          ? 'Die Orga bestätigt deine Anfrage.' + (current ? ' Bis dahin behältst du deinen bisherigen Platz.' : '')
          : current
            ? 'Dein bisheriger Platz wird nach der Bestätigung für andere freigegeben.'
            : 'Der Platz gehört sofort dir.'}
      </p>
      {actions.reserve.error && <div className="error-box">{errorMessage(actions.reserve.error)}</div>}
      <button
        type="button"
        className="btn btn--primary"
        disabled={actions.reserve.isPending}
        onClick={() => actions.reserve.mutate({ label: seat.label, companions: companions || undefined }, { onSuccess: onDone })}
      >
        {rules.approvalRequired ? 'Anfrage senden' : current ? 'Wechsel bestätigen' : `Platz ${seat.label} reservieren`}
      </button>
      <button type="button" className="btn btn--outline" onClick={onDone}>
        Auswahl aufheben
      </button>
    </section>
  );
}
