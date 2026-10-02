import { useMemo, useRef } from 'react';
import { errorMessage } from '../../api/client';
import type { EventRequest, EventView, HeadingKey, InfoItem } from '../../api/types';
import { AccentInput } from '../AccentInput';
import { Logo } from '../../components/Logo';
import { useAdmin } from '../AdminContext';
import { useEventMutations, useInfos } from '../adminApi';
import { useToast } from '../Toast';
import { useDraft } from '../useDraft';
import { DateTimeInput, MoveButtons, RemoveButton, SaveBar, Section, move } from './common';

function toRequest(e: EventView): EventRequest {
  return {
    title: e.title,
    subtitle: e.subtitle,
    location: e.location,
    timezone: e.timezone,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    welcomeTitle: e.welcomeTitle,
    welcomeText: e.welcomeText,
    kioskIntervalSec: e.kioskIntervalSec,
    kioskViews: e.kioskViews,
    loginHeadline: e.loginHeadline,
    headings: { ...e.headings },
  };
}

const HEADINGS: { key: HeadingKey; label: string; fallback: string }[] = [
  { key: 'servers', label: 'Gameserver', fallback: 'Gameserver' },
  { key: 'schedule', label: 'Programm', fallback: 'Programm' },
  { key: 'tournaments', label: 'Turniere', fallback: 'Turniere' },
  { key: 'seating', label: 'Sitzplan', fallback: 'Sitzplatzordnung' },
  { key: 'network', label: 'WLAN-Karte', fallback: 'WLAN' },
];

export function GeneralSection() {
  const { event } = useAdmin();
  const mutations = useEventMutations();
  const toast = useToast();
  const source = useMemo(() => toRequest(event), [event]);
  const { draft, setDraft, dirty, reset } = useDraft<EventRequest>(source, source);
  const infos = useInfos(event.id);
  const infoDraft = useDraft<InfoItem[]>(infos.query.data, []);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EventRequest>(key: K, value: EventRequest[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const tz = event.timezone;

  const save = async () => {
    try {
      if (dirty) {
        await mutations.update.mutateAsync({ id: event.id, body: draft });
        reset();
      }
      if (infoDraft.dirty) {
        const saved = await infos.save.mutateAsync(infoDraft.draft.filter((i) => i.label.trim() && i.value.trim()));
        infoDraft.reset(saved);
      }
      toast('Allgemein gespeichert');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const setInfo = (index: number, patch: Partial<InfoItem>) =>
    infoDraft.setDraft((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <Section id="inhalte" title="Inhalte & Willkommen">
      <AccentInput label="Titel der LAN" value={draft.title} onChange={(v) => set('title', v)} maxLength={120} />
      <div className="form-grid">
        <label className="lbl">
          Ort
          <input className="in" value={draft.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="Gemeindesaal Musterdorf" />
        </label>
        <label className="lbl">
          Untertitel (optional)
          <input className="in" value={draft.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Die LAN im Dorf" />
        </label>
      </div>
      <div className="form-grid">
        <label className="lbl">
          Beginn
          <DateTimeInput value={draft.startsAt} onChange={(v) => v && set('startsAt', v)} timeZone={tz} required />
        </label>
        <label className="lbl">
          Ende
          <DateTimeInput value={draft.endsAt} onChange={(v) => v && set('endsAt', v)} timeZone={tz} required />
        </label>
      </div>
      <div className="logo-edit">
        <Logo src={event.logoUrl} className="logo-edit__img" />
        <div className="logo-edit__actions">
          <span className="small muted">Logo (PNG, SVG, JPEG, WebP · max. 2 MB). Für 4K-Screens am besten SVG oder ≥ 512 px.</span>
          <div className="row-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
              Logo hochladen
            </button>
            {event.logoUrl && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => mutations.removeLogo.mutate(event.id)}>
                Entfernen
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                mutations.uploadLogo.mutate(
                  { id: event.id, file },
                  { onSuccess: () => toast('Logo aktualisiert'), onError: (err) => toast(errorMessage(err), 'error') },
                );
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <AccentInput
        label="Willkommens-Titel (Zeilenumbruch erlaubt)"
        multiline
        value={draft.welcomeTitle ?? ''}
        onChange={(v) => set('welcomeTitle', v)}
        placeholder="Willkommen an der {lila:LAN}."
        maxLength={300}
      />
      <label className="lbl">
        Willkommenstext
        <textarea className="in" rows={4} value={draft.welcomeText ?? ''} onChange={(e) => set('welcomeText', e.target.value)} />
      </label>

      <AccentInput
        label="Slogan auf der Login-Seite"
        multiline
        value={draft.loginHeadline ?? ''}
        onChange={(v) => set('loginHeadline', v)}
        placeholder={'Platz sichern.\n{lila:Rechner} {blau:einstecken.} {gruen:Zocken.}'}
        maxLength={300}
      />

      <details className="details">
        <summary>Überschriften der Webseite</summary>
        <p className="admin-hint no-margin">Leer lassen für den Standardtext. Auch hier lassen sich Wörter einfärben.</p>
        {HEADINGS.map((h) => (
          <AccentInput
            key={h.key}
            label={h.label}
            value={draft.headings[h.key] ?? ''}
            placeholder={h.fallback}
            maxLength={120}
            onChange={(v) => set('headings', { ...draft.headings, [h.key]: v })}
          />
        ))}
      </details>

      <div className="stack-sm">
        <span className="small muted">Info-Einträge («Gut zu wissen»-Karte)</span>
        {infoDraft.draft.map((info, i) => (
          <div key={i} className="info-row">
            <input className="in" value={info.label} aria-label="Bezeichnung" placeholder="WLAN" onChange={(e) => setInfo(i, { label: e.target.value })} />
            <input className="in" value={info.value} aria-label="Wert" placeholder="SSID · Passwort" onChange={(e) => setInfo(i, { value: e.target.value })} />
            <MoveButtons
              onUp={i > 0 ? () => infoDraft.setDraft((l) => move(l, i, -1)) : undefined}
              onDown={i < infoDraft.draft.length - 1 ? () => infoDraft.setDraft((l) => move(l, i, 1)) : undefined}
            />
            <RemoveButton label="Eintrag löschen" onClick={() => infoDraft.setDraft((l) => l.filter((_, j) => j !== i))} />
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm align-start" onClick={() => infoDraft.setDraft((l) => [...l, { label: '', value: '' }])}>
          + Info hinzufügen
        </button>
      </div>

      <details className="details">
        <summary>Beamer / Kiosk-Modus</summary>
        <div className="form-grid">
          <label className="lbl">
            Wechsel alle … Sekunden
            <input className="in mono" type="number" min={5} max={600} value={draft.kioskIntervalSec} onChange={(e) => set('kioskIntervalSec', Number(e.target.value))} />
          </label>
          <label className="lbl">
            Zeitzone
            <input className="in mono" value={draft.timezone ?? ''} onChange={(e) => set('timezone', e.target.value)} placeholder="Europe/Zurich" />
          </label>
        </div>
        <KioskViews value={draft.kioskViews} onChange={(v) => set('kioskViews', v)} />
        <p className="small muted">
          Beamer-URL: <code className="mono">{window.location.origin}/?kiosk=1</code> – rotiert durch die gewählten Ansichten (ausschalten mit <code className="mono">?kiosk=0</code>).
        </p>
      </details>

      <SaveBar dirty={dirty || infoDraft.dirty} saving={mutations.update.isPending || infos.save.isPending} onSave={save} onReset={() => { reset(); infoDraft.reset(); }} />
    </Section>
  );
}

const VIEW_OPTIONS = [
  { key: 'overview', label: 'Übersicht' },
  { key: 'tournaments', label: 'Turniere' },
  { key: 'seating', label: 'Sitzplan' },
  { key: 'stats', label: 'Nerd Stats' },
];

function KioskViews({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value.split(',').map((v) => v.trim()).filter(Boolean);
  const toggle = (key: string) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    onChange(VIEW_OPTIONS.map((o) => o.key).filter((k) => next.includes(k)).join(','));
  };
  return (
    <div className="check-row">
      {VIEW_OPTIONS.map((o) => (
        <label key={o.key} className="check">
          <input type="checkbox" checked={selected.includes(o.key)} onChange={() => toggle(o.key)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
