import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RoomSide, SeatMapView, SeatOrientation } from '../../api/types';
import { SeatMap } from './SeatMap';

function map(orientation: SeatOrientation, beamerSide: RoomSide, extra: Partial<SeatMapView> = {}): SeatMapView {
  const seats = (row: string) =>
    Array.from({ length: 3 }, (_, i) => ({
      label: `${row}${i + 1}`,
      number: i + 1,
      status: i === 0 ? ('TAKEN' as const) : ('FREE' as const),
      gamertag: i === 0 ? 'RushB' : null,
      pending: i === 2,
      note: null,
    }));
  return {
    orientation,
    rowsReversed: false,
    numbersReversed: false,
    markers: [
      { kind: 'BEAMER', label: 'Beamer', side: beamerSide, align: 'CENTER' },
      { kind: 'ENTRANCE', label: 'Eingang', side: 'TOP', align: 'END' },
    ],
    rows: [
      { id: 1, label: 'A', seats: seats('A') },
      { id: 2, label: 'B', seats: seats('B') },
    ],
    taken: 2,
    free: 4,
    blocked: 0,
    total: 6,
    ...extra,
  };
}

const rowLabels = (container: HTMLElement) => [...container.querySelectorAll('.seatmap__row-label')].map((e) => e.textContent);

describe('SeatMap', () => {
  it.each(['LEFT', 'RIGHT', 'TOP', 'BOTTOM'] as const)('keeps the orientation when the beamer is %s', (side) => {
    const rows = render(<SeatMap map={map('ROWS', side)} />);
    expect(rows.container.querySelector('.seatmap')).toHaveAttribute('data-orientation', 'horizontal');
    rows.unmount();
    const columns = render(<SeatMap map={map('COLUMNS', side)} />);
    expect(columns.container.querySelector('.seatmap')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('places markers on their own edge independent of the beamer', () => {
    render(<SeatMap map={map('ROWS', 'BOTTOM')} />);
    expect(within(screen.getByTestId('edge-BOTTOM')).getByText('Beamer')).toBeInTheDocument();
    const entrance = within(screen.getByTestId('edge-TOP')).getByText('Eingang');
    expect(entrance.closest('.seatmap__tag')).toHaveClass('seatmap__tag--end');
    expect(screen.queryByTestId('edge-LEFT')).not.toBeInTheDocument();
  });

  it('reverses row and seat order on request', () => {
    const { container } = render(<SeatMap map={map('ROWS', 'TOP', { rowsReversed: true, numbersReversed: true })} />);
    expect(rowLabels(container)).toEqual(['B', 'A']);
    const firstRow = container.querySelector('.seatmap__seats')!;
    expect([...firstRow.querySelectorAll('.seat__label')].map((e) => e.textContent)).toEqual(['B3', 'B2', 'B1']);
  });

  it('labels seats for screen readers and reports clicks', async () => {
    const onSelect = vi.fn();
    render(<SeatMap map={map('COLUMNS', 'LEFT')} mine="B3" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Platz A1, belegt von RushB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Platz A3, angefragt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Platz B3, dein Platz' })).toHaveClass('is-mine');
    await userEvent.click(screen.getByRole('button', { name: 'Platz B2, frei' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ label: 'B2' }));
  });
});
