import type { WidgetProps } from './registry';

interface Monitor {
  id: number;
  name: string;
  beats: number[];
  status: number;
  ping: number | null;
  uptime24: number | null;
}

interface KumaData {
  monitors: Monitor[];
  up: number;
  total: number;
}

// Uptime Kuma status codes: 0 down, 1 up, 2 pending, 3 maintenance.
const BEAT_COLOR: Record<number, string> = { 0: 'var(--red)', 1: 'var(--green)', 2: 'var(--yellow)', 3: 'var(--blue)' };

export function kumaSummary(data: KumaData) {
  return { up: data.up, total: data.total, allUp: data.up === data.total };
}

export function UptimeKumaWidget({ data }: WidgetProps<KumaData>) {
  if (!data?.monitors) return <p className="empty">Keine Monitore.</p>;
  return (
    <div className="kuma" role="table" aria-label="Service-Status">
      <div role="row" className="kuma__row kuma__row--head">
        <span role="columnheader">Dienst</span>
        <span role="columnheader">Letzte Checks</span>
        <span role="columnheader">Uptime 24h</span>
        <span role="columnheader">Ping</span>
      </div>
      <div className="kuma__body">
        {data.monitors.map((m) => {
          const down = m.status === 0;
          return (
            <div role="row" key={m.id} className={'kuma__row' + (down ? ' is-down' : '')}>
              <span role="cell" className="kuma__name">
                <span className="dot" style={{ background: BEAT_COLOR[m.status] ?? 'var(--grey)' }} />
                {m.name}
              </span>
              <span role="cell" className="kuma__beats" aria-label={`${m.beats.filter((b) => b === 1).length} von ${m.beats.length} Checks ok`}>
                {Array.from({ length: Math.max(0, 48 - m.beats.length) }, (_, i) => (
                  <span key={'e' + i} style={{ background: 'var(--border)' }} />
                ))}
                {m.beats.map((b, i) => (
                  <span key={i} style={{ background: BEAT_COLOR[b] ?? 'var(--border)' }} />
                ))}
              </span>
              <span role="cell" className="mono">
                {m.uptime24 != null ? `${(m.uptime24 * 100).toFixed(m.uptime24 >= 0.9995 ? 0 : 1)}%` : '–'}
              </span>
              <span role="cell" className="mono muted">
                {m.ping != null && !down ? `${m.ping} ms` : '–'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
