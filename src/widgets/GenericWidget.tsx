import type { WidgetProps } from './registry';

/** Fallback for integration types without a dedicated widget: shows top-level values as tiles. */
export function GenericWidget({ data }: WidgetProps<Record<string, unknown>>) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v));
  if (entries.length === 0) return <p className="empty">Keine Daten.</p>;
  return (
    <div className="w-grid">
      {entries.map(([k, v]) => (
        <div key={k} className="tile">
          <span className="k">{k}</span>
          <span className="mono" style={{ fontSize: '1.25rem' }}>
            {String(v ?? '–')}
          </span>
        </div>
      ))}
    </div>
  );
}
