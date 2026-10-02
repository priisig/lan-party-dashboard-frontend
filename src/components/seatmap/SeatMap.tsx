import type { BeamerSide, SeatMapView, SeatView } from '../../api/types';
import './seatmap.css';

export interface SeatMapProps {
  map: SeatMapView;
  selected?: string | null;
  /** Seats matching a search, drawn with a glow. */
  highlighted?: ReadonlySet<string>;
  onSelect?: (seat: SeatView) => void;
  /** Admin view: dashed free seats, note markers. */
  admin?: boolean;
}

/** Rows run parallel to the beamer wall unless it is on the side – then each row becomes a vertical column. */
export function isVertical(side: BeamerSide) {
  return side === 'LEFT' || side === 'RIGHT';
}

export function SeatMap({ map, selected, highlighted, onSelect, admin = false }: SeatMapProps) {
  const vertical = isVertical(map.beamerSide);
  return (
    <div className={`seatmap seatmap--${map.beamerSide.toLowerCase()}`} data-orientation={vertical ? 'vertical' : 'horizontal'}>
      <div className="seatmap__stage" aria-hidden="true">
        <span>BÜHNE · BEAMER</span>
      </div>
      <div className="seatmap__room">
        {vertical && map.labelStart && <EdgeLabel text={map.labelStart} arrow="↑" />}
        <div className="seatmap__rows">
          {map.rows.map((row) => (
            <div key={row.id} className="seatmap__row" role="group" aria-label={`Reihe ${row.label}`}>
              <span className="seatmap__row-label">{row.label}</span>
              <div className="seatmap__seats" style={{ ['--count' as string]: row.seats.length }}>
                {row.seats.map((seat) => (
                  <SeatButton
                    key={seat.label}
                    seat={seat}
                    selected={seat.label === selected}
                    highlighted={highlighted?.has(seat.label) ?? false}
                    admin={admin}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {vertical && map.labelEnd && <EdgeLabel text={map.labelEnd} arrow="↓" />}
        {!vertical && (map.labelStart || map.labelEnd) && (
          <div className="seatmap__edges">
            <span>{map.labelStart ? `← ${map.labelStart}` : ''}</span>
            <span>{map.labelEnd ? `${map.labelEnd} →` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EdgeLabel({ text, arrow }: { text: string; arrow: string }) {
  return (
    <div className="seatmap__edge">
      {arrow} {text}
    </div>
  );
}

function SeatButton({
  seat,
  selected,
  highlighted,
  admin,
  onSelect,
}: {
  seat: SeatView;
  selected: boolean;
  highlighted: boolean;
  admin: boolean;
  onSelect?: (seat: SeatView) => void;
}) {
  const state = seat.status === 'TAKEN' ? 'belegt von ' + seat.gamertag : seat.status === 'BLOCKED' ? 'gesperrt' : seat.pending ? 'angefragt' : 'frei';
  const name = seat.status === 'TAKEN' ? seat.gamertag : seat.status === 'BLOCKED' ? 'Orga' : seat.pending ? 'angefragt' : '';
  const classes = [
    'seat',
    `seat--${seat.status.toLowerCase()}`,
    seat.pending && seat.status === 'FREE' ? 'seat--pending' : '',
    selected ? 'is-selected' : '',
    highlighted ? 'is-highlighted' : '',
    admin ? 'seat--admin' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={classes}
      aria-label={`Platz ${seat.label}, ${state}`}
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

export function SeatLegend() {
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
      <span>
        <span className="seat-legend__box seat-legend__box--blocked" />
        Orga / gesperrt
      </span>
    </div>
  );
}
