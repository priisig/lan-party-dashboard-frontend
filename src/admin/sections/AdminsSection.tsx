import { useState } from 'react';
import { errorMessage } from '../../api/client';
import type { AdminWithCode } from '../../api/types';
import { useAdmin } from '../AdminContext';
import { useAdmins } from '../adminApi';
import { useToast } from '../Toast';
import { RemoveButton, Section } from './common';

export function AdminsSection() {
  const { me } = useAdmin();
  const api = useAdmins();
  const toast = useToast();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [revealed, setRevealed] = useState<AdminWithCode | null>(null);

  const reveal = (result: AdminWithCode) => setRevealed(result);

  return (
    <Section
      id="admins"
      title="Admins"
      action={
        !adding && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>
            + Admin
          </button>
        )
      }
    >
      {revealed && (
        <div className="ok-box code-reveal">
          <span>
            Code für <strong>{revealed.admin.name}</strong> (wird nur jetzt angezeigt):
          </span>
          <span className="mono code-reveal__code">{revealed.code}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRevealed(null)}>
            Notiert
          </button>
        </div>
      )}
      {adding && (
        <form
          className="row-actions"
          onSubmit={(e) => {
            e.preventDefault();
            api.create.mutate(name, {
              onSuccess: (r) => {
                reveal(r);
                setName('');
                setAdding(false);
              },
              onError: (err) => toast(errorMessage(err), 'error'),
            });
          }}
        >
          <input className="in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus required />
          <button type="submit" className="btn btn--primary btn--sm">
            Anlegen
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAdding(false)}>
            Abbrechen
          </button>
        </form>
      )}
      <ul className="admin-list">
        {(api.query.data ?? []).map((a) => (
          <li key={a.id}>
            <div className="admin-list__who">
              <strong>
                {a.name}
                {a.id === me.id && <span className="muted"> (du)</span>}
              </strong>
              <span className="mono small muted">Code ••••••{a.codeHint}</span>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => window.confirm(`Neuen Code für ${a.name} erzeugen? Der alte Code funktioniert danach nicht mehr.`) && api.regenerate.mutate(a.id, { onSuccess: reveal })}
            >
              Neuer Code
            </button>
            {a.id !== me.id ? (
              <RemoveButton
                label="Admin entfernen"
                onClick={() => window.confirm(`${a.name} entfernen?`) && api.remove.mutate(a.id, { onError: (e) => toast(errorMessage(e), 'error') })}
              />
            ) : (
              <span className="ico-spacer" />
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
