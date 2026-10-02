import { useMemo } from 'react';
import { errorMessage } from '../../api/client';
import type { ScheduleDto } from '../../api/types';
import { lanDayOf, lanDays, lanDayTimeToIso, timeOf } from '../../lib/lanDays';
import { useAdmin } from '../AdminContext';
import { useScheduleAdmin, useTournamentsAdmin } from '../adminApi';
import { useToast } from '../Toast';
import { useDraft } from '../useDraft';
import { AddButton, RemoveButton, SaveBar, Section } from './common';

const COLORS = [
  { value: '#6B6390', label: 'Grau' },
  { value: '#3D8BFF', label: 'Blau' },
  { value: '#9B5CFF', label: 'Violett' },
  { value: '#22D37A', label: 'Grün' },
  { value: '#4FD1E8', label: 'Cyan' },
  { value: '#E8B33A', label: 'Gelb' },
  { value: '#FF5A6A', label: 'Rot' },
];

export function ScheduleSection() {
  const { event } = useAdmin();
  const tz = event.timezone;
  const { query, save } = useScheduleAdmin(event.id);
  const tournaments = useTournamentsAdmin(event.id).query.data ?? [];
  const { draft, setDraft, dirty, reset } = useDraft<ScheduleDto[]>(query.data, []);
  const toast = useToast();
  const days = useMemo(() => lanDays(event.startsAt, event.endsAt, tz), [event.startsAt, event.endsAt, tz]);

  const update = (i: number, patch: Partial<ScheduleDto>) => setDraft((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setDayTime = (i: number, day: string, time: string) => update(i, { startsAt: lanDayTimeToIso(day, time, tz) });

  const add = () => {
    const last = draft[draft.length - 1];
    const day = last ? lanDayOf(last.startsAt, tz) : (days[0]?.key ?? event.startsAt.slice(0, 10));
    setDraft((l) => [...l, { startsAt: lanDayTimeToIso(day, '12:00', tz), endsAt: null, title: '', location: null, color: '#6B6390', tournamentId: null }]);
  };

  const onSave = () =>
    save.mutate(
      draft.filter((s) => s.title.trim()),
      { onSuccess: (list) => { reset(list); toast('Zeitplan gespeichert'); }, onError: (e) => toast(errorMessage(e), 'error') },
    );

  return (
    <Section id="zeitplan" title="Zeitplan" action={<AddButton label="Programmpunkt" onClick={add} />}>
      <p className="small muted no-margin">Zeiten vor 06:00 gehören zum Vortag («Sa 01:00» = Nacht von Samstag auf Sonntag). Ende leer = bis zum nächsten Punkt.</p>
      <div className="sched-edit">
        {draft.length === 0 && <p className="empty">Noch keine Programmpunkte.</p>}
        {draft.map((s, i) => {
          const day = lanDayOf(s.startsAt, tz);
          const time = timeOf(s.startsAt, tz);
          return (
            <div key={s.id ?? 'new' + i} className="sched-edit__row">
              <select className="in sched-edit__day" aria-label="Tag" value={day} onChange={(e) => setDayTime(i, e.target.value, time)}>
                {days.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
                {!days.some((d) => d.key === day) && <option value={day}>{day}</option>}
              </select>
              <input className="in mono sched-edit__time" type="time" aria-label="Startzeit" value={time} onChange={(e) => e.target.value && setDayTime(i, day, e.target.value)} />
              <input className="in sched-edit__title" aria-label="Programm" value={s.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Programm" />
              <input className="in mono sched-edit__where" aria-label="Ort / Server" value={s.location ?? ''} onChange={(e) => update(i, { location: e.target.value })} placeholder="Ort" />
              <select className="in sched-edit__color" aria-label="Farbe" value={s.color} onChange={(e) => update(i, { color: e.target.value })} style={{ borderLeft: `0.375rem solid ${s.color}` }}>
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select className="in sched-edit__tournament" aria-label="Turnier" value={s.tournamentId ?? ''} onChange={(e) => update(i, { tournamentId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">– kein Turnier –</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <RemoveButton label="Programmpunkt löschen" onClick={() => setDraft((l) => l.filter((_, j) => j !== i))} />
            </div>
          );
        })}
      </div>
      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onReset={() => reset()} />
    </Section>
  );
}
