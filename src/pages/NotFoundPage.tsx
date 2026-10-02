import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="no-event">
      <h1 className="display">404 · Respawn nötig</h1>
      <p className="muted">Diese Seite gibt es nicht.</p>
      <Link to="/" className="btn btn--primary">
        Zum Dashboard
      </Link>
    </div>
  );
}
