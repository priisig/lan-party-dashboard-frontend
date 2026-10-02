import type { WidgetProps } from './registry';

interface MinecraftData {
  address: string;
  online: number | null;
  max: number | null;
  version: string | null;
  motd: string | null;
  players: string[];
  tps?: number;
  day?: number;
  isNight?: boolean;
}

const COLORS = ['#9B5CFF', '#3D8BFF', '#22D37A', '#4FD1E8', '#7A5CFF', '#2FB37A'];

export function MinecraftWidget({ data }: WidgetProps<MinecraftData>) {
  if (!data) return <p className="empty">Keine Daten.</p>;
  const hiddenPlayers = Math.max(0, (data.online ?? 0) - data.players.length);
  return (
    <div className="mc">
      <div className="w-grid w-grid--3">
        <div className="tile">
          <span className="k">Spieler</span>
          <span className="v" style={{ color: 'var(--green-text)' }}>
            {data.online ?? '–'}
            <span className="u">/{data.max ?? '?'}</span>
          </span>
        </div>
        <div className="tile">
          <span className="k">TPS</span>
          <span className="v" style={{ color: data.tps != null && data.tps < 18 ? 'var(--yellow)' : undefined }}>
            {data.tps != null ? data.tps.toFixed(1) : '–'}
          </span>
        </div>
        <div className="tile">
          <span className="k">Version</span>
          <span className="v mc__version">{data.version ?? '–'}</span>
        </div>
      </div>
      {data.motd && (
        <div className="tile">
          <span className="k">MOTD</span>
          <span className="mc__motd">{data.motd}</span>
        </div>
      )}
      <div className="mc__players">
        <span className="h h--sm">Online</span>
        {data.players.length === 0 && (data.online ?? 0) === 0 ? (
          <p className="empty">Niemand online.</p>
        ) : (
          <div className="mc__player-list">
            {data.players.map((p, i) => (
              <span key={p} className="mc__player">
                <span className="mc__head" style={{ background: COLORS[i % COLORS.length] }} />
                {p}
              </span>
            ))}
            {hiddenPlayers > 0 && <span className="mc__player muted">+{hiddenPlayers} weitere</span>}
          </div>
        )}
      </div>
      {data.day != null && (
        <div className="w-grid mc__footer">
          <div className="tile">
            <span className="k">Ingame-Tag</span>
            <span className="mono mc__footer-value">
              Tag {data.day}
              {data.isNight != null ? (data.isNight ? ' · Nacht' : ' · Tag') : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
