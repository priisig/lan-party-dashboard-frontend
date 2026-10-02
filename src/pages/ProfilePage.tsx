import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useLogout, useMe, useMyEvent, useProfile } from '../api/auth';
import { errorMessage } from '../api/client';
import type { Profile } from '../api/types';
import { Avatar } from '../components/Avatar';
import './profile.css';

const EMPTY: Profile = {
  nickname: '',
  email: '',
  firstName: null,
  lastName: null,
  steam: null,
  discord: null,
  team: null,
  favouriteGame: null,
  showOnSeatmap: true,
};

export function ProfilePage() {
  const me = useMe();
  if (me.isPending) return <main className="site-page" />;
  if (!me.data) return <Navigate to="/login?next=/profil" replace />;
  return <ProfileContent nickname={me.data.nickname} orga={me.data.role === 'ORGA'} />;
}

function ProfileContent({ nickname, orga }: { nickname: string; orga: boolean }) {
  const my = useMyEvent(true);
  const data = my.data;
  return (
    <main className="site-page profile">
      <aside className="profile__side">
        <section className="card profile__card">
          <Avatar nickname={nickname} size="lg" />
          <div>
            <h1 className="profile__name">{nickname}</h1>
            <div className="small muted">
              {orga ? 'Orga-Team' : 'Teilnehmer'}
              {data && data.lanCount > 1 ? ` · dabei seit ${data.lanCount} LANs` : ''}
            </div>
          </div>
          {orga && (
            <Link to="/admin" className="btn btn--outline btn--sm">
              Zum Admin-Bereich
            </Link>
          )}
        </section>

        <section className={'card profile__seat' + (data?.seat ? ' profile__seat--ok' : '')}>
          <div className="profile__eyebrow">MEINE RESERVATION</div>
          <div className="profile__seat-row">
            <span className="profile__seat-label">{data?.seat ?? data?.seatPending ?? '–'}</span>
            {data?.seatPending && !data.seat && <span className="chip chip--warn">angefragt</span>}
          </div>
          <div className="row-actions wrap">
            <span className={'chip ' + (data?.paid ? 'chip--live' : 'chip--warn')}>{data?.paid ? 'Bezahlt' : 'Zahlung offen'}</span>
            <span className={'chip ' + (data?.checkedIn ? 'chip--live' : 'chip--done')}>{data?.checkedIn ? 'Eingecheckt' : 'Nicht eingecheckt'}</span>
          </div>
          <Link to="/sitzplan" className="small">
            {data?.seat ? 'Reservation verwalten' : 'Platz wählen'}
          </Link>
        </section>

        <section className="card">
          <div className="profile__eyebrow">MEINE TURNIERE</div>
          {data && data.tournaments.length === 0 && <p className="small muted no-margin">Noch keine Anmeldung.</p>}
          {data?.tournaments.map((t) => (
            <Link key={t.tournamentId} to={`/turniere?t=${t.tournamentId}`} className="profile__tournament">
              <span>
                <span className="dot dot--sm" style={{ background: t.color }} /> {t.name}
                {t.teamName ? ` · ${t.teamName}` : ''}
              </span>
              <span className="small" style={{ color: 'var(--green-text)' }}>
                {t.statusText}
              </span>
            </Link>
          ))}
          <Link to="/turniere" className="small">
            Alle Turniere
          </Link>
        </section>
      </aside>

      <div className="profile__main">
        <ProfileForm />
        <PasswordForm />
      </div>
    </main>
  );
}

function ProfileForm() {
  const { query, save } = useProfile();
  const [draft, setDraft] = useState<Profile>(EMPTY);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [query.data]);
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const text = (key: 'firstName' | 'lastName' | 'steam' | 'discord' | 'team' | 'favouriteGame', label: string, placeholder = '') => (
    <label className="lbl">
      {label}
      <input className="in" maxLength={80} value={draft[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
    </label>
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(draft, { onSuccess: () => setSaved(true) });
  };

  return (
    <form className="card profile__form" onSubmit={submit}>
      <h2 className="card-title">Persönliche Daten</h2>
      <div className="profile__grid">
        <label className="lbl">
          Nickname
          <input className="in" required minLength={2} maxLength={40} value={draft.nickname} onChange={(e) => set('nickname', e.target.value)} />
        </label>
        <label className="lbl">
          E-Mail
          <input className="in" type="email" required maxLength={200} value={draft.email} onChange={(e) => set('email', e.target.value)} />
        </label>
        {text('firstName', 'Vorname')}
        {text('lastName', 'Nachname')}
      </div>
      <h3 className="card-title card-title--sm">Gaming-Accounts</h3>
      <div className="profile__grid">
        {text('steam', 'Steam-Name')}
        {text('discord', 'Discord')}
        {text('team', 'Team / Clan')}
        {text('favouriteGame', 'Lieblingsspiel')}
      </div>
      <label className="check">
        <input type="checkbox" checked={draft.showOnSeatmap} onChange={(e) => set('showOnSeatmap', e.target.checked)} />
        Meinen Nickname im Sitzplan anzeigen
      </label>
      {save.error && <div className="error-box">{errorMessage(save.error)}</div>}
      {saved && <div className="ok-box">Gespeichert.</div>}
      <div className="row-actions">
        <button type="button" className="btn btn--outline push-right" onClick={() => query.data && setDraft(query.data)}>
          Verwerfen
        </button>
        <button type="submit" className="btn btn--primary" disabled={save.isPending || !query.data}>
          Speichern
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const { password } = useProfile();
  const logout = useLogout();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [done, setDone] = useState(false);
  const mismatch = repeat.length > 0 && repeat !== next;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    password.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setDone(true);
          setCurrent('');
          setNext('');
          setRepeat('');
        },
      },
    );
  };
  return (
    <form className="card profile__form" onSubmit={submit}>
      <h2 className="card-title">Passwort ändern</h2>
      <div className="profile__grid profile__grid--3">
        <label className="lbl">
          Aktuelles Passwort
          <input className="in" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="lbl">
          Neues Passwort
          <input className="in" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="lbl">
          Wiederholen
          <input className="in" type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-invalid={mismatch} />
        </label>
      </div>
      {mismatch && <div className="error-box">Die Passwörter stimmen nicht überein.</div>}
      {password.error && <div className="error-box">{errorMessage(password.error)}</div>}
      {done && <div className="ok-box">Passwort geändert.</div>}
      <div className="row-actions">
        <button type="button" className="btn btn--ghost" onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/') })}>
          Abmelden
        </button>
        <button type="submit" className="btn btn--blue push-right" disabled={password.isPending || mismatch}>
          Passwort aktualisieren
        </button>
      </div>
    </form>
  );
}
