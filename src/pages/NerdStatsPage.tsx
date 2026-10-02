import type { ComponentType } from 'react';
import { useEventInfo, useServers, useStats } from '../api/queries';
import type { Widget } from '../api/types';
import { formatTime } from '../lib/time';
import { widgetFor } from '../widgets/registry';
import './stats.css';

export function NerdStatsPage() {
  const { data } = useStats();
  const { data: servers } = useServers();
  const queried = (servers ?? []).filter((s) => s.players != null);

  return (
    <main className="page stats">
      {data && data.kpis.length > 0 && (
        <section className="card stats__kpis" aria-label="Kennzahlen">
          {data.kpis.map((k) => (
            <div key={k.key} className="tile">
              <span className="k">{k.label}</span>
              <span className="v" style={{ color: k.tone === 'good' ? 'var(--green-text)' : k.tone === 'bad' ? 'var(--red)' : undefined }}>
                {k.value}
                {k.unit && <span className="u"> {k.unit}</span>}
              </span>
            </div>
          ))}
        </section>
      )}
      <div className="stats__widgets">
        {data?.widgets.map((w) => <WidgetCard key={w.id} widget={w} />)}
        {queried.length > 0 && (
          <section className="card">
            <h2 className="h">Game Server · Live</h2>
            <ul className="stats__servers">
              {queried.map((s) => (
                <li key={s.id}>
                  <span className="dot" style={{ background: s.online ? 'var(--green)' : 'var(--grey)' }} />
                  <span className="stats__server-name">{s.name}</span>
                  {s.map && <span className="mono small muted">{s.map}</span>}
                  <span className="mono">
                    {s.players}/{s.maxPlayers ?? '?'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {data && data.widgets.length === 0 && queried.length === 0 && (
          <section className="card">
            <h2 className="h">Nerd Stats</h2>
            <p className="empty">Noch keine Integrationen eingerichtet (Admin → Integrationen).</p>
          </section>
        )}
      </div>
    </main>
  );
}

function WidgetCard({ widget }: { widget: Widget }) {
  const { data: info } = useEventInfo();
  const definition = widgetFor(widget.type);
  const Component = definition.component as ComponentType<{ name: string; data: unknown }>;
  const badge = summaryBadge(widget);
  return (
    <section className={'card stats__widget' + (definition.wide ? ' is-wide' : '')}>
      <div className="card-head">
        <h2 className="h">{widget.name}</h2>
        {badge}
      </div>
      {widget.error && (
        <div className="stats__stale">
          Keine Verbindung{widget.lastOkAt && info ? ` · Daten von ${formatTime(widget.lastOkAt, info.event.timezone)}` : ''}
        </div>
      )}
      {widget.data != null ? <Component name={widget.name} data={widget.data} /> : !widget.error && <p className="empty">Lade …</p>}
    </section>
  );
}

function summaryBadge(widget: Widget) {
  const data = widget.data as { up?: number; total?: number; address?: string } | null;
  if (widget.type === 'uptime-kuma' && data?.total != null) {
    const allUp = data.up === data.total;
    return (
      <span className={'chip ' + (allUp ? 'chip--live' : 'chip--warn')}>
        {data.up} / {data.total} online
      </span>
    );
  }
  if (widget.type === 'minecraft' && data?.address) {
    return <span className="mono small" style={{ color: 'var(--link)' }}>{data.address}</span>;
  }
  return null;
}
