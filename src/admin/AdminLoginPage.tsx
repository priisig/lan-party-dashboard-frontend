import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useEventInfo } from '../api/queries';
import { errorMessage } from '../api/client';
import { Logo } from '../components/Logo';
import { useLogin } from './adminApi';

export function AdminLoginPage() {
  const [code, setCode] = useState('');
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: info } = useEventInfo();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(code, { onSuccess: () => navigate(from, { replace: true }) });
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__brand">
          <Logo src={info?.event.logoUrl} className="login__logo" />
          <div className="login__titles">
            <span className="login__title">{info?.event.title ?? 'LAN Dashboard'}</span>
            <span className="muted">Admin-Bereich</span>
          </div>
        </div>
        <label className="lbl login__label">
          Admin-Code
          <input
            className="in login__input"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••••"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        {login.error && <div className="error-box">{errorMessage(login.error)}</div>}
        <button type="submit" className="btn btn--primary login__btn" disabled={login.isPending || code.length === 0}>
          {login.isPending ? 'Prüfe …' : 'Einloggen'}
        </button>
        <p className="small muted login__hint">
          Jeder Admin hat einen eigenen fixen Code, vergeben vom Orga-Team. Nach 5 Fehlversuchen wird der Login 5 Minuten gesperrt.
        </p>
        <Link to="/">← Zurück zum Dashboard</Link>
      </form>
    </div>
  );
}
