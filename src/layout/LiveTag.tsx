import { useLive } from '../api/queries';

export function LiveTag() {
  const { data } = useLive();
  if (!data?.text) return null;
  return (
    <div className="live-tag" role="status">
      <span className="dot live" style={{ background: 'var(--green)' }} />
      <span className="live-tag__text">LIVE · {data.text}</span>
    </div>
  );
}
