import { render, screen } from '@testing-library/react';
import type { Bracket } from '../../api/types';
import { BracketView } from './BracketView';

const side = (name: string, score: string | null, winner = false, placeholder = false) => ({ name, score, winner, placeholder });

const bracket: Bracket = {
  type: 'double elimination',
  state: 'underway',
  currentRound: 'Winner Final',
  participants: [],
  rounds: [{ number: 1, name: 'Winner Final', matches: [{ id: 1, identifier: 'A', player1: side('Alpha', '2', true), player2: side('Bravo', '1'), state: 'complete', live: false }] }],
  losersRounds: [{ number: -1, name: 'Loser Final', matches: [{ id: 2, identifier: 'B', player1: side('Bravo', null), player2: side('Sieger Match C', null, false, true), state: 'open', live: true }] }],
};

describe('BracketView', () => {
  it('shows winners and losers brackets with round names', () => {
    render(<BracketView bracket={bracket} />);
    expect(screen.getByText('Winner Bracket')).toBeInTheDocument();
    expect(screen.getByText('Loser Bracket')).toBeInTheDocument();
    expect(screen.getByText('Winner Final')).toBeInTheDocument();
    expect(screen.getByText('Sieger Match C').closest('.tm')).toHaveClass('ph');
    expect(screen.getByText('Alpha').closest('.tm')).toHaveClass('w');
    expect(screen.getByLabelText('Match B')).toHaveClass('m--live');
  });
});
