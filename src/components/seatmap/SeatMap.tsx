import type { RoomMarker, RoomSide, SeatMapView, SeatView } from '../../api/types';
import './seatmap.css';

export interface SeatMapProps {
  map: SeatMapView;
  selected?: string | null;
  /** The viewer's own seat, drawn green. */
  mine?: string | null;
  /** Seats matching a search, drawn with a glow. */
  highlighted?: ReadonlySet<string>;
  onSelect?: (seat: SeatView) => void;
  /** Admin view: dashed free seats, note markers. */
  admin?: boolean;
  /** Small preview without labels (overview teaser). */
  compact?: boolean;
}

const SIDES: RoomSide[] = ['TOP', 'LEFT', 'RIGHT', 'BOTTOM'];

/**
 * Seat map inside a "room": the orientation only comes from map.orientation, the beamer and other landmarks
 * are markers on any of the four edges. Moving the beamer therefore never rotates the seats.
 */
export function SeatMap({ map, selected, mine, highlighted, onSelect, admin = false, compact = false }: SeatMapProps) {
  const vertical = map.orientation === 'COLUMNS';
  const rows = map.rowsReversed ? [...map.rows].reverse() : map.rows;
  return (
    <div className={'seatmap' + (compact ? ' seatmap--compact' : '')} data-orientation={vertical ? 'vertical' : 'horizontal'} aria-hidden={compact || undefined}>
      {SIDES.map((side) => (
        <Edge key={side} side={side} markers={map.markers.filter((m) => m.side === side)} />
      ))}
      <div className="seatmap__rows">
        {rows.map((row) => {
          const seats = map.numbersReversed ? [...row.seats].reverse() : row.seats;
          return (
            <div key={row.id} className="seatmap__row" role={compact ? undefined : 'group'} aria-label={compact ? undefined : `Reihe ${row.label}`}>
              <span className="seatmap__row-label">{row.label}</span>
              <div className="seatmap__seats" style={{ ['--count' as string]: seats.length }}>
                {seats.map((seat) =>
                  compact ? (
                    <span key={seat.label} className={seatClasses(seat, seat.label === mine, false, false, false)} />
                  ) : (
                    <SeatButton
                      key={seat.label}
                      seat={seat}
                      mine={seat.label === mine}
                      selected={seat.label === selected}
                      highlighted={highlighted?.has(seat.label) ?? false}
                      admin={admin}
                      onSelect={onSelect}
                    />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One edge of the room: the beamer as a full-length stage bar, other markers as tags at start / centre / end. */
function Edge({ side, markers }: { side: RoomSide; markers: RoomMarker[] }) {
  if (markers.length === 0) return null;
  const beamers = markers.filter((m) => m.kind === 'BEAMER');
  const tags = markers.filter((m) => m.kind !== 'BEAMER');
  return (
    <div className={`seatmap__edge seatmap__edge--${side.toLowerCase()}`} data-testid={`edge-${side}`}>
      {beamers.map((m, i) => (
        <div key={'b' + i} className="seatmap__stage">
          <span>{m.label}</span>
        </div>
      ))}
      {tags.length > 0 && (
        <div className="seatmap__tags">
          {tags.map((m, i) => (
            <span key={'t' + i} className={`seatmap__tag seatmap__tag--${m.align.toLowerCase()}` + (m.kind === 'ENTRANCE' ? ' seatmap__tag--entrance' : '')}>
              {m.kind === 'ENTRANCE' && <span aria-hidden="true">⇥ </span>}
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function seatClasses(seat: SeatView, mine: boolean, selected: boolean, highlighted: boolean, admin: boolean) {
  return [
    'seat',
    `seat--${seat.status.toLowerCase()}`,
    seat.pending && seat.status === 'FREE' ? 'seat--pending' : '',
    mine ? 'is-mine' : '',
    selected ? 'is-selected' : '',
    highlighted ? 'is-highlighted' : '',
    admin ? 'seat--admin' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function SeatButton({
  seat,
  mine,
  selected,
  highlighted,
  admin,
  onSelect,
}: {
  seat: SeatView;
  mine: boolean;
  selected: boolean;
  highlighted: boolean;
  admin: boolean;
  onSelect?: (seat: SeatView) => void;
}) {
  const occupant = seat.gamertag ?? 'unbekannt';
  const state = mine
    ? 'dein Platz'
    : seat.status === 'TAKEN'
      ? 'belegt von ' + occupant
      : seat.status === 'BLOCKED'
        ? 'gesperrt'
        : seat.pending
          ? 'angefragt'
          : 'frei';
  const name = seat.status === 'TAKEN' ? (seat.gamertag ?? 'Belegt') : seat.status === 'BLOCKED' ? 'Orga' : seat.pending ? 'angefragt' : '';
  return (
    <button
      type="button"
      className={seatClasses(seat, mine, selected, highlighted, admin)}
      aria-label={`Platz ${seat.label}, ${state}`}
      title={`Platz ${seat.label} – ${state}`}
      aria-pressed={selected}
      onClick={onSelect ? () => onSelect(seat) : undefined}
      disabled={!onSelect}
    >
      <span className="seat__label">{seat.label}</span>
      {name && <span className="seat__name">{name}</span>}
      {admin && seat.note && <span className="seat__note" title={seat.note} aria-label={`Notiz: ${seat.note}`} />}
    </button>
  );
}

export function SeatLegend({ withMine = false }: { withMine?: boolean }) {
  return (
    <div className="seat-legend">
      <span>
        <span className="seat-legend__box seat-legend__box--free" />
        Frei
      </span>
      <span>
        <span className="seat-legend__box seat-legend__box--taken" />
        Belegt
      </span>
      <span>
        <span className="seat-legend__box seat-legend__box--selected" />
        Ausgewählt
      </span>
      {withMine && (
        <span>
          <span className="seat-legend__box seat-legend__box--mine" />
          Mein Platz
        </span>
      )}
      <span>
        <span className="seat-legend__box seat-legend__box--blocked" />
        Gesperrt (Orga)
      </span>
    </div>
  );
}
