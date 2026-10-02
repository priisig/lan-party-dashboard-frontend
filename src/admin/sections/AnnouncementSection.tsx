import { errorMessage } from '../../api/client';
import type { AnnouncementDto } from '../../api/types';
import { useAdmin } from '../AdminContext';
import { useAnnouncements } from '../adminApi';
import { useToast } from '../Toast';
import { useDraft } from '../useDraft';
import { AddButton, DateTimeInput, RemoveButton, SaveBar, Section } from './common';

export function AnnouncementSection() {
  const { event } = useAdmin();
  const { query, save } = useAnnouncements(event.id);
  const { draft, setDraft, dirty, reset } = useDraft<AnnouncementDto[]>(query.data, []);
  const toast = useToast();

  const update = (i: number, patch: Partial<AnnouncementDto>) => setDraft((l) => l.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const onSave = () =>
    save.mutate(
      draft.filter((a) => a.text.trim()),
      { onSuccess: (list) => { reset(list); toast('Durchsagen gespeichert'); }, onError: (e) => toast(errorMessage(e), 'error') },
    );

  return (
    <Section
      id="durchsage"
      title="Durchsage"
      action={<AddButton label="Durchsage" onClick={() => setDraft((l) => [...l, { text: '', enabled: true, startsAt: null, endsAt: null }])} />}
    >
      <p className="small muted no-margin">
        Erscheint als Band unter dem Header. Zusätzlich blendet das Dashboard 30 Minuten vor jedem Anmeldeschluss automatisch einen Hinweis ein.
      </p>
      {draft.length === 0 && <p className="empty">Keine Durchsagen.</p>}
      {draft.map((a, i) => (
        <div key={a.id ?? 'new' + i} className="subcard">
          <div className="subcard__head">
            <label className="check">
              <input type="checkbox" checked={a.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
              Anzeigen
            </label>
            <RemoveButton label="Durchsage löschen" onClick={() => setDraft((l) => l.filter((_, j) => j !== i))} />
          </div>
          <label className="lbl">
            Text
            <input className="in" value={a.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Pizza-Bestellung bis 18:30 an der Theke" />
          </label>
          <div className="form-grid">
            <label className="lbl">
              Einblenden ab (optional)
              <DateTimeInput value={a.startsAt} onChange={(v) => update(i, { startsAt: v })} timeZone={event.timezone} />
            </label>
            <label className="lbl">
              Ausblenden um (optional)
              <DateTimeInput value={a.endsAt} onChange={(v) => update(i, { endsAt: v })} timeZone={event.timezone} />
            </label>
          </div>
        </div>
      ))}
      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onReset={() => reset()} />
    </Section>
  );
}
