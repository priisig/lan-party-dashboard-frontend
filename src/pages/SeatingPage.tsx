import { type FormEvent, useMemo, useState } from 'react';
import { useRequestSeat, useSeats } from '../api/queries';
import { errorMessage } from '../api/client';
import type { SeatView } from '../api/types';
import { SeatLegend, SeatMap } from '../components/seatmap/SeatMap';
import { loadPref, savePref } from '../lib/storage';
import './seating.css';

export function SeatingPage() {
  const { data: map } = useSeats();
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

  return (
    <main className="page seating">
      <section className="card seating__map" aria-label="Saalplan">
        <div className="card-head">
          <h2 className="h">Saalplan</h2>
          <SeatLegend />
        </div>
        {map ? (
          map.total === 0 ? (
            <p className="empty">Der Sitzplan ist noch nicht eingerichtet.</p>
          ) : (
            <SeatMap map={map} selected={selectedLabel} highlighted={highlighted} onSelect={(s) => setSelectedLabel(s.label)} />
          )
        ) : (
          <p className="empty">Lade …</p>
        )}
      </section>

      <aside className="seating__side">
        <ReserveCard seat={selected} />
        <section className="card">
          <h2 className="h">Wer sitzt wo?</h2>
          <label className="lbl">
            Suche nach Gamertag
            <input className="in" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="z. B. Rush B" />
          </label>
          {query.trim().length >= 2 && (
            <ul className="seat-results">
              {matches.length === 0 && <li className="muted">Niemand gefunden.</li>}
              {matches.map((s) => (
                <li key={s.label}>
                  <button className="seat-results__btn" onClick={() => setSelectedLabel(s.label)}>
                    <strong>{s.gamertag}</strong>
                    <span className="mono muted">→ {s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {map && (
            <div className="seating__stats">
              <div className="tile">
                <span className="k">Belegt</span>
                <span className="v">{map.taken}</span>
              </div>
              <div className="tile">
                <span className="k">Frei</span>
                <span className="v" style={{ color: 'var(--green-text)' }}>
                  {map.free}
                </span>
              </div>
            </div>
          )}
        </section>
      </aside>
    </main>
  );
}

function ReserveCard({ seat }: { seat: SeatView | null }) {
  const request = useRequestSeat();
  const [gamertag, setGamertag] = useState(() => loadPref('gamertag'));
  const [companions, setCompanions] = useState('');
  const [sentFor, setSentFor] = useState<string | null>(null);

  if (!seat) {
    return (
      <section className="card card--accent">
        <h2 className="h">Platz reservieren</h2>
        <p className="muted">Wähle im Saalplan einen freien Platz aus.</p>
      </section>
    );
  }

  const free = seat.status === 'FREE' && !seat.pending;
  const stateText =
    seat.status === 'TAKEN'
      ? `belegt von ${seat.gamertag}`
      : seat.status === 'BLOCKED'
        ? 'Orga-Platz'
        : seat.pending
          ? 'Reservation angefragt'
          : 'ist frei';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    request.mutate(
      { label: seat.label, gamertag, companions: companions || undefined },
      {
        onSuccess: () => {
          savePref('gamertag', gamertag);
          savePref('seat', seat.label);
          setSentFor(seat.label);
          setCompanions('');
        },
      },
    );
  };

  return (
    <section className="card card--accent">
      <h2 className="h">Platz reservieren</h2>
      <div className="reserve__head">
        <span className="display reserve__label">{seat.label}</span>
        <span style={{ color: free ? 'var(--green-text)' : 'var(--text-muted)' }}>{stateText}</span>
      </div>
      {sentFor === seat.label ? (
        <div className="ok-box">Anfrage für Platz {seat.label} gesendet. Die Orga bestätigt sie bald.</div>
      ) : (
        <form className="reserve__form" onSubmit={submit}>
          <label className="lbl">
            Dein Gamertag
            <input className="in" required maxLength={60} value={gamertag} onChange={(e) => setGamertag(e.target.value)} placeholder="Gamertag" disabled={!free} />
          </label>
          <label className="lbl">
            Mit wem willst du sitzen? (optional)
            <input className="in" maxLength={300} value={companions} onChange={(e) => setCompanions(e.target.value)} placeholder="Team / Kollegen" disabled={!free} />
          </label>
          {request.error && <div className="error-box">{errorMessage(request.error)}</div>}
          <button type="submit" className="btn btn--go" disabled={!free || request.isPending}>
            Platz {seat.label} reservieren
          </button>
        </form>
      )}
      <p className="small muted reserve__note">Reservationen werden von der Orga bestätigt. Fixe Zuteilung durch Admins hat Vorrang.</p>
    </section>
  );
}
