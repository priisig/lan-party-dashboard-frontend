import { type FormEvent, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useLogin, useMe, useRegisterAccount } from '../api/auth';
import { errorMessage } from '../api/client';
import { useEventInfo } from '../api/queries';
import { AccentText } from '../components/AccentText';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateRange } from '../lib/time';
import './auth.css';

const DEFAULT_HEADLINE = 'Platz sichern.\n{lila:Rechner} {blau:einstecken.} {gruen:Zocken.}';

/** Only allow in-app targets for ?next= (no open redirects). */
function safeNext(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { data: info } = useEventInfo();
  const me = useMe();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const event = info?.event;
  useDocumentTitle(mode === 'login' ? 'Anmelden' : 'Account erstellen');

  // Logged in (also right after submitting the form): continue to ?next=, new accounts pick a seat first.
  if (me.data) return <Navigate to={next ?? (mode === 'register' ? '/sitzplan' : '/')} replace />;

  const query = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="auth">
      <section className="auth__brand">
        <Link to="/" className="auth__home">
          <Logo src={event?.logoUrl} className="auth__logo-sm" />
          <span className="auth__title">{event ? <AccentText text={event.title} /> : ''}</span>
        </Link>
        <div className="auth__pitch">
          <Logo src={event?.logoUrl} className="auth__logo" />
          <h1 className="auth__headline">
            <AccentText text={event?.loginHeadline || DEFAULT_HEADLINE} />
          </h1>
          <ul className="auth__checks">
            <li>
              <Icon name="check" size={20} />
              Sitzplatz direkt im Saalplan wählen
            </li>
            <li>
              <Icon name="check" size={20} />
              Für Turniere anmelden und Teams bilden
            </li>
            <li>
              <Icon name="check" size={20} />
              Alle Infos zu Servern &amp; Netzwerk an einem Ort
            </li>
          </ul>
        </div>
        <div className="auth__meta mono">{event ? [formatDateRange(event.startsAt, event.endsAt, event.timezone), event.location].filter(Boolean).join(' · ') : ''}</div>
      </section>

      <section className="auth__panel">
        <div className="auth__box">
          <div role="tablist" aria-label="Login oder Registrierung" className="segmented auth__tabs">
            <Link role="tab" aria-selected={mode === 'login'} to={`/login${query}`} replace className={'segmented__btn' + (mode === 'login' ? ' is-on' : '')}>
              Anmelden
            </Link>
            <Link role="tab" aria-selected={mode === 'register'} to={`/registrieren${query}`} replace className={'segmented__btn' + (mode === 'register' ? ' is-on' : '')}>
              Account erstellen
            </Link>
          </div>
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </section>
    </div>
  );
}

function LoginForm() {
  const login = useLogin();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [forgot, setForgot] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ login: name, password });
  };
  return (
    <form className="auth__form" onSubmit={submit}>
      <h2 className="auth__form-title">Willkommen zurück</h2>
      <label className="lbl">
        E-Mail oder Nickname
        <input className="in in--lg" autoComplete="username" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="lbl">
        <span className="auth__pw-head">
          <label htmlFor="login-pw">Passwort</label>
          <button type="button" className="link-btn" onClick={() => setForgot((f) => !f)} aria-expanded={forgot}>
            Vergessen?
          </button>
        </span>
        <input id="login-pw" className="in in--lg" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {forgot && <div className="ok-box">Kein Problem: Melde dich beim Orga-Team. Es setzt dir ein neues Passwort, das du danach im Profil ändern kannst.</div>}
      {login.error && <div className="error-box">{errorMessage(login.error)}</div>}
      <button type="submit" className="btn btn--primary btn--lg" disabled={login.isPending}>
        {login.isPending ? 'Anmelden …' : 'Anmelden'}
      </button>
    </form>
  );
}

function RegisterForm() {
  const register = useRegisterAccount();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [rules, setRules] = useState(false);
  const mismatch = repeat.length > 0 && repeat !== password;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    register.mutate({ nickname, email, password, rulesAccepted: rules });
  };
  return (
    <form className="auth__form" onSubmit={submit}>
      <h2 className="auth__form-title">Account erstellen</h2>
      <label className="lbl">
        Nickname
        <input className="in in--lg" required minLength={2} maxLength={40} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="So sehen dich die anderen" autoFocus />
      </label>
      <label className="lbl">
        E-Mail
        <input className="in in--lg" type="email" autoComplete="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <div className="form-grid">
        <label className="lbl">
          Passwort
          <input className="in in--lg" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mind. 8 Zeichen" />
        </label>
        <label className="lbl">
          Wiederholen
          <input
            className="in in--lg"
            type="password"
            autoComplete="new-password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            aria-invalid={mismatch}
          />
        </label>
      </div>
      {mismatch && <div className="error-box">Die Passwörter stimmen nicht überein.</div>}
      <label className="check auth__rules">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} required />
        <span>Ich halte mich an die Hausordnung und bin einverstanden, dass mein Nickname auf dem Sitzplan erscheint (im Profil abschaltbar).</span>
      </label>
      {register.error && <div className="error-box">{errorMessage(register.error)}</div>}
      <button type="submit" className="btn btn--primary btn--lg" disabled={register.isPending || mismatch}>
        {register.isPending ? 'Erstelle Account …' : 'Account erstellen & Platz wählen'}
      </button>
    </form>
  );
}
