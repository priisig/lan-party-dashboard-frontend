import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BeamerSide, SeatMapView } from '../../api/types';
import { SeatMap } from './SeatMap';

function map(beamerSide: BeamerSide): SeatMapView {
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
    beamerSide,
    labelStart: 'Eingang',
    labelEnd: 'Theke',
    rows: [
      { id: 1, label: 'A', seats: seats('A') },
      { id: 2, label: 'B', seats: seats('B') },
    ],
    taken: 2,
    free: 4,
    blocked: 0,
    total: 6,
  };
}

describe('SeatMap', () => {
  it.each(['LEFT', 'RIGHT'] as const)('renders rows as vertical columns when the beamer is %s', (side) => {
    const { container } = render(<SeatMap map={map(side)} />);
    expect(container.querySelector('.seatmap')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByText('↑ Eingang')).toBeInTheDocument();
    expect(screen.getByText('↓ Theke')).toBeInTheDocument();
  });

  it.each(['TOP', 'BOTTOM'] as const)('keeps horizontal rows when the beamer is %s', (side) => {
    const { container } = render(<SeatMap map={map(side)} />);
    expect(container.querySelector('.seatmap')).toHaveAttribute('data-orientation', 'horizontal');
    expect(screen.getByText('← Eingang')).toBeInTheDocument();
  });

  it('labels seats for screen readers and reports clicks', async () => {
    const onSelect = vi.fn();
    render(<SeatMap map={map('LEFT')} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Platz A1, belegt von RushB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Platz A3, angefragt' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Platz B2, frei' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ label: 'B2' }));
  });
});
