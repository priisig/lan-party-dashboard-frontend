import { errorMessage } from '../../api/client';
import type { AnnouncementDto, BannerTone } from '../../api/types';
import { AccentText } from '../../components/AccentText';
import { AccentInput } from '../AccentInput';
import { useAdmin } from '../AdminContext';
import { useAnnouncements } from '../adminApi';
import { useToast } from '../Toast';
import { useDraft } from '../useDraft';
import { AddButton, DateTimeInput, RemoveButton, SaveBar, Section, Switch } from './common';

const KINDS: { value: BannerTone; label: string; tag: string }[] = [
  { value: 'LIVE', label: 'Live', tag: 'LIVE' },
  { value: 'INFO', label: 'Info', tag: 'INFO' },
  { value: 'WARNING', label: 'Warnung', tag: 'ACHTUNG' },
];

export function AnnouncementSection() {
  const { event } = useAdmin();
  const { query, save } = useAnnouncements(event.id);
  const { draft, setDraft, dirty, reset } = useDraft<AnnouncementDto[]>(query.data, []);
  const toast = useToast();

  const update = (i: number, patch: Partial<AnnouncementDto>) => setDraft((l) => l.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const onSave = () =>
    save.mutate(
      draft.filter((a) => a.text.trim()),
      {
        onSuccess: (list) => {
          reset(list);
          toast('Ankündigungen gespeichert');
        },
        onError: (e) => toast(errorMessage(e), 'error'),
      },
    );

  return (
    <Section
      id="ankuendigungen"
      title="Ankündigungsbanner"
      action={<AddButton label="Banner" onClick={() => setDraft((l) => [...l, { text: '', kind: 'INFO', enabled: true, startsAt: null, endsAt: null }])} />}
    >
      <p className="admin-hint no-margin">Erscheint unter dem Header. 30 Minuten vor jedem Anmeldeschluss blendet die Webseite zusätzlich automatisch einen Hinweis ein.</p>
      {draft.length === 0 && <p className="empty">Keine Ankündigungen.</p>}
      {draft.map((a, i) => {
        const kind = KINDS.find((k) => k.value === a.kind) ?? KINDS[1];
        return (
          <div key={a.id ?? 'new' + i} className="subcard">
            <div className="subcard__head">
              <Switch checked={a.enabled} onChange={(v) => update(i, { enabled: v })} label="Banner anzeigen" text={a.enabled ? 'Sichtbar' : 'Ausgeblendet'} />
              <RemoveButton label="Ankündigung löschen" onClick={() => setDraft((l) => l.filter((_, j) => j !== i))} />
            </div>
            <AccentInput label="Text" body multiline rows={2} maxLength={500} value={a.text} onChange={(v) => update(i, { text: v })} placeholder="CS2 Viertelfinale läuft auf Server #1 …" />
            <div className="form-grid form-grid--3">
              <label className="lbl">
                Typ
                <select className="in" value={a.kind} onChange={(e) => update(i, { kind: e.target.value as BannerTone })}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lbl">
                Von (optional)
                <DateTimeInput value={a.startsAt} onChange={(v) => update(i, { startsAt: v })} timeZone={event.timezone} />
              </label>
              <label className="lbl">
                Bis (optional)
                <DateTimeInput value={a.endsAt} onChange={(v) => update(i, { endsAt: v })} timeZone={event.timezone} />
              </label>
            </div>
            {a.text.trim() && (
              <div className={`banner-preview banner-preview--${a.kind.toLowerCase()}`} style={{ opacity: a.enabled ? 1 : 0.4 }} aria-label="Vorschau">
                <span className="announce__tag">{kind.tag}</span>
                <span>
                  <AccentText text={a.text} />
                </span>
              </div>
            )}
          </div>
        );
      })}
      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onReset={() => reset()} />
    </Section>
  );
}
