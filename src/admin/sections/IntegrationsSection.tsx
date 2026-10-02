import { useState } from 'react';
import { errorMessage } from '../../api/client';
import type { IntegrationView, ProviderInfo, TestResult } from '../../api/types';
import { formatTime } from '../../lib/time';
import { useAdmin } from '../AdminContext';
import { useIntegrationsAdmin, useSettings } from '../adminApi';
import { useToast } from '../Toast';
import { Section } from './common';

export function IntegrationsSection() {
  const { event } = useAdmin();
  const api = useIntegrationsAdmin(event.id);
  const types = api.types.data ?? [];
  const [newType, setNewType] = useState('');

  return (
    <Section id="integrationen" title="Integrationen">
      <div className="stack-sm">
        <span className="admin-hint">Datenquellen für die Nerd-Stats-Ansicht (Uptime Kuma, Minecraft …).</span>
        {(api.query.data ?? []).map((i) => (
          <IntegrationEditor key={i.id} integration={i} provider={types.find((t) => t.type === i.type)} />
        ))}
        {newType ? (
          <IntegrationEditor provider={types.find((t) => t.type === newType)} onDone={() => setNewType('')} />
        ) : (
          <div className="row-actions">
            <select className="in" aria-label="Neue Integration" value="" onChange={(e) => setNewType(e.target.value)}>
              <option value="">+ Integration hinzufügen …</option>
              {types.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Section>
  );
}

/** Global settings: Challonge API key and the push token for scripts. */
export function SettingsSection() {
  return (
    <Section id="einstellungen" title="Einstellungen">
      <ChallongeKey />
      <PushToken />
    </Section>
  );
}

function ChallongeKey() {
  const { query, saveChallonge } = useSettings();
  const toast = useToast();
  const [key, setKey] = useState('');
  const s = query.data;
  return (
    <div className="stack-sm">
      <label className="lbl">
        Challonge API-Key
        <div className="row-actions">
          <input className="in mono" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={s?.challongeKeyHint ? `gespeichert (${s.challongeKeyHint})` : 'challonge.com → Settings → Developer API'} />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!key.trim() || saveChallonge.isPending}
            onClick={() => saveChallonge.mutate(key, { onSuccess: () => { setKey(''); toast('API-Key gespeichert'); }, onError: (e) => toast(errorMessage(e), 'error') })}
          >
            Speichern
          </button>
        </div>
      </label>
      {s && <span className={s.challongeConfigured ? 'ok' : 'small muted'}>{s.challongeConfigured ? '● Key hinterlegt' : 'Noch kein Key'}</span>}
    </div>
  );
}

function PushToken() {
  const { query, regeneratePushToken } = useSettings();
  const token = query.data?.pushToken;
  if (!token) return null;
  const example = `curl -X PUT ${window.location.origin}/api/push/metrics \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "Content-Type: application/json" \\\n  -d '[{"key":"clients","label":"LAN-Clients online","value":"87"}]'`;
  return (
    <details className="details">
      <summary>Stats-Push-API (für Skripte: Router, Monitoring …)</summary>
      <label className="lbl">
        Push-Token
        <div className="row-actions">
          <input className="in mono" readOnly value={token} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => window.confirm('Neuen Token erzeugen? Bestehende Skripte müssen angepasst werden.') && regeneratePushToken.mutate()}>
            Neu
          </button>
        </div>
      </label>
      <pre className="code">{example}</pre>
    </details>
  );
}

function IntegrationEditor({ integration, provider, onDone }: { integration?: IntegrationView; provider?: ProviderInfo; onDone?: () => void }) {
  const { event } = useAdmin();
  const api = useIntegrationsAdmin(event.id);
  const toast = useToast();
  const [open, setOpen] = useState(!integration);
  const [name, setName] = useState(integration?.name ?? provider?.label ?? '');
  const [enabled, setEnabled] = useState(integration?.enabled ?? true);
  const [config, setConfig] = useState<Record<string, unknown>>(integration?.config ?? {});
  const [test, setTest] = useState<TestResult | null>(null);

  if (!provider) return null;
  const body = { type: provider.type, name, enabled, sort: integration?.sort ?? 99, config };

  const save = () => {
    const opts = {
      onSuccess: () => {
        toast('Integration gespeichert');
        setOpen(false);
        onDone?.();
      },
      onError: (e: unknown) => toast(errorMessage(e), 'error'),
    };
    if (integration) api.update.mutate({ id: integration.id, body }, opts);
    else api.create.mutate(body, opts);
  };

  const status = integration?.lastError ? (
    <span className="chip chip--bad">Fehler</span>
  ) : integration?.lastOkAt ? (
    <span className="chip chip--live">OK · {formatTime(integration.lastOkAt, event.timezone)}</span>
  ) : null;

  return (
    <div className="subcard">
      <div className="subcard__head">
        <button type="button" className="subcard__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="subcard__title">{name || provider.label}</span>
          <span className="small muted">{provider.label}</span>
        </button>
        {status}
      </div>
      {integration?.lastError && open && <div className="error-box small">{integration.lastError}</div>}
      {open && (
        <>
          <label className="lbl">
            Anzeigename
            <input className="in" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {provider.fields.map((f) => (
            <label key={f.name} className="lbl">
              {f.label}
              {f.required ? ' *' : ''}
              <input
                className="in mono"
                type={f.kind === 'password' ? 'password' : f.kind === 'number' ? 'number' : 'text'}
                placeholder={f.placeholder}
                value={String(config[f.name] ?? '')}
                onChange={(e) => setConfig((c) => ({ ...c, [f.name]: f.kind === 'number' && e.target.value ? Number(e.target.value) : e.target.value }))}
              />
            </label>
          ))}
          <label className="check">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Auf Nerd Stats anzeigen
          </label>
          {test && <div className={test.ok ? 'ok-box' : 'error-box'}>{test.ok ? '● Verbunden' : test.message}</div>}
          <div className="row-actions wrap">
            <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={api.create.isPending || api.update.isPending}>
              Speichern
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={api.test.isPending}
              onClick={() => api.test.mutate({ id: integration?.id ?? null, body }, { onSuccess: setTest, onError: (e) => setTest({ ok: false, message: errorMessage(e), data: null }) })}
            >
              {api.test.isPending ? 'Teste …' : 'Verbindung testen'}
            </button>
            {integration ? (
              <button type="button" className="btn btn--danger btn--sm push-right" onClick={() => window.confirm(`${name} entfernen?`) && api.remove.mutate(integration.id)}>
                Entfernen
              </button>
            ) : (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onDone}>
                Abbrechen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
