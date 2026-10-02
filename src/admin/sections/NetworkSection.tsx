import { useMemo } from 'react';
import { errorMessage } from '../../api/client';
import type { NetworkDto, WifiSecurity } from '../../api/types';
import { Icon } from '../../components/Icon';
import { QrCode } from '../../components/WifiQr';
import { downloadQrPng, wifiPayload } from '../../lib/wifiQr';
import { useAdmin } from '../AdminContext';
import { useEventMutations } from '../adminApi';
import { useToast } from '../Toast';
import { useDraft } from '../useDraft';
import { SaveBar, Section } from './common';

type Field = keyof NetworkDto;

/** Saves the whole network record; each card only edits its own fields (WLAN/LAN vs. Teamspeak). */
function useNetworkDraft() {
  const { event } = useAdmin();
  const mutations = useEventMutations();
  const toast = useToast();
  const source = useMemo(() => ({ ...event.network }), [event.network]);
  const draft = useDraft<NetworkDto>(source, source);
  const set = <K extends Field>(key: K, value: NetworkDto[K]) => draft.setDraft((d) => ({ ...d, [key]: value }));
  const save = (fields: Field[], message: string) => {
    const body = { ...event.network };
    for (const f of fields) (body as Record<Field, unknown>)[f] = draft.draft[f];
    mutations.network.mutate(
      { id: event.id, body },
      {
        onSuccess: (saved) => {
          draft.reset({ ...saved.network });
          toast(message);
        },
        onError: (e) => toast(errorMessage(e), 'error'),
      },
    );
  };
  return { ...draft, set, save, saving: mutations.network.isPending };
}

const WIFI_FIELDS: Field[] = ['wifiSsid', 'wifiPassword', 'wifiSecurity', 'wifiHidden', 'lanIpMode', 'lanSubnet', 'lanGateway'];
const TS_FIELDS: Field[] = ['tsAddress', 'tsPort', 'tsPassword'];

function dirtyIn(draft: NetworkDto, source: NetworkDto, fields: Field[]) {
  return fields.some((f) => (draft[f] ?? '') !== (source[f] ?? ''));
}

export function NetworkSection() {
  const { event } = useAdmin();
  const { draft, set, save, saving, reset } = useNetworkDraft();
  const dirty = dirtyIn(draft, event.network, WIFI_FIELDS);
  const payload = draft.wifiSsid ? wifiPayload(draft.wifiSsid, draft.wifiPassword, draft.wifiSecurity, draft.wifiHidden) : null;
  const text = (key: 'wifiSsid' | 'wifiPassword' | 'lanSubnet' | 'lanGateway' | 'lanIpMode', label: string, placeholder: string, max = 60) => (
    <label className="lbl">
      {label}
      <input className="in mono" maxLength={max} value={(draft[key] as string | null) ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
    </label>
  );

  return (
    <Section id="netzwerk" title="Netzwerk (WLAN / LAN)">
      <div className="network-edit">
        <div className="network-edit__fields">
          {text('wifiSsid', 'WLAN-Name (SSID)', 'LAN-Party', 32)}
          {text('wifiPassword', 'WLAN-Passwort', 'mind. 8 Zeichen', 63)}
          <label className="lbl">
            Verschlüsselung
            <select className="in" value={draft.wifiSecurity} onChange={(e) => set('wifiSecurity', e.target.value as WifiSecurity)}>
              <option value="WPA">WPA2/WPA3</option>
              <option value="WPA3">nur WPA3</option>
              <option value="OPEN">Offen</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.wifiHidden} onChange={(e) => set('wifiHidden', e.target.checked)} />
            Versteckte SSID
          </label>
          {text('lanIpMode', 'IP-Vergabe (Kabel)', 'DHCP (automatisch)')}
          {text('lanSubnet', 'LAN-Subnetz', '10.10.0.0/16')}
          {text('lanGateway', 'Gateway / DNS', '10.10.0.1')}
        </div>
        <div className="network-edit__qr">
          {payload ? (
            <>
              <QrCode text={payload} label="WLAN-QR-Code" className="network-edit__code" />
              <span className="admin-hint">Wird automatisch aus SSID &amp; Passwort erzeugt</span>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() =>
                  downloadQrPng(payload, `wlan-${draft.wifiSsid}.png`, [
                    `WLAN: ${draft.wifiSsid}`,
                    ...(draft.wifiSecurity !== 'OPEN' && draft.wifiPassword ? [`Passwort: ${draft.wifiPassword}`] : []),
                  ])
                }
              >
                <Icon name="download" size={16} /> PNG für Tischaufsteller
              </button>
            </>
          ) : (
            <span className="admin-hint">SSID eintragen, dann erscheint hier der QR-Code.</span>
          )}
        </div>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={() => save(WIFI_FIELDS, 'Netzwerk gespeichert')} onReset={() => reset()} />
    </Section>
  );
}

export function TeamspeakSection() {
  const { event } = useAdmin();
  const { draft, set, save, saving, reset } = useNetworkDraft();
  const dirty = dirtyIn(draft, event.network, TS_FIELDS);
  return (
    <Section id="teamspeak" title="Teamspeak">
      <div className="form-grid form-grid--3">
        <label className="lbl">
          Adresse
          <input className="in mono" maxLength={120} value={draft.tsAddress ?? ''} onChange={(e) => set('tsAddress', e.target.value)} placeholder="ts.lan.local" />
        </label>
        <label className="lbl">
          Port
          <input
            className="in mono"
            type="number"
            min={1}
            max={65535}
            value={draft.tsPort ?? ''}
            onChange={(e) => set('tsPort', e.target.value ? Number(e.target.value) : null)}
            placeholder="9987"
          />
        </label>
        <label className="lbl">
          Passwort
          <input className="in mono" maxLength={60} value={draft.tsPassword ?? ''} onChange={(e) => set('tsPassword', e.target.value)} />
        </label>
      </div>
      <p className="admin-hint no-margin">Leer lassen, um die Teamspeak-Karte auf der Webseite auszublenden.</p>
      <SaveBar dirty={dirty} saving={saving} onSave={() => save(TS_FIELDS, 'Teamspeak gespeichert')} onReset={() => reset()} />
    </Section>
  );
}
