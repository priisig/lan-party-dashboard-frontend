import type { Bracket, BracketMatch, BracketRound } from '../../api/types';
import './bracket.css';

/** Renders a Challonge bracket (winners + optional losers bracket) in the dashboard design. */
export function BracketView({ bracket }: { bracket: Bracket }) {
  return (
    <div className="bracket-wrap">
      <BracketSection rounds={bracket.rounds} title={bracket.losersRounds.length > 0 ? 'Winner Bracket' : null} />
      {bracket.losersRounds.length > 0 && <BracketSection rounds={bracket.losersRounds} title="Loser Bracket" />}
    </div>
  );
}

function BracketSection({ rounds, title }: { rounds: BracketRound[]; title: string | null }) {
  return (
    <section className="bracket-section">
      {title && <h3 className="h h--sm bracket-section__title">{title}</h3>}
      <div className="bracket" style={{ ['--rounds' as string]: rounds.length }}>
        {rounds.map((round) => (
          <div key={round.number} className="bracket__round">
            <span className="h h--sm">{round.name}</span>
            <div className="bracket__matches">
              {round.matches.map((m) => (
                <MatchBox key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MatchBox({ match }: { match: BracketMatch }) {
  const done = match.state === 'complete';
  return (
    <div className={'m' + (match.live ? ' m--live' : '')} aria-label={`Match ${match.identifier}`}>
      {[match.player1, match.player2].map((side, i) => (
        <div
          key={i}
          className={'tm' + (side.winner ? ' w' : '') + (done && !side.winner ? ' l' : '') + (side.placeholder ? ' ph' : '')}
        >
          <span className="tm__name">
            {match.live && i === 0 && <span className="dot dot--sm live" style={{ background: 'var(--green)' }} />}
            {side.name}
          </span>
          <span className="mono">{side.score ?? '–'}</span>
        </div>
      ))}
    </div>
  );
}
