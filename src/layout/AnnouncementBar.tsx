import { useBanners } from '../api/queries';
import { useNow } from '../hooks/useNow';
import { formatCountdown } from '../lib/time';
import type { Banner } from '../api/types';

/** The "Durchsage" band under the header. Hidden when there is nothing to announce. */
export function AnnouncementBar() {
  const { data } = useBanners();
  const now = useNow(1000);
  const banners = (data ?? []).filter((b) => !b.countdownTo || Date.parse(b.countdownTo) > now.getTime());
  if (banners.length === 0) return null;
  const urgent = banners.some((b) => b.kind === 'REGISTRATION_CLOSING');
  return (
    <div className={'announce' + (urgent ? ' announce--urgent' : '')} role="region" aria-label="Durchsagen" aria-live="polite">
      <span className="announce__label">DURCHSAGE</span>
      <div className="announce__items">
        {banners.map((b, i) => (
          <BannerItem key={b.id} banner={b} now={now} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

function BannerItem({ banner, now, first }: { banner: Banner; now: Date; first: boolean }) {
  return (
    <span className="announce__item">
      {!first && <span className="announce__sep" aria-hidden="true">·</span>}
      <span>{banner.text}</span>
      {banner.countdownTo && (
        <span className="announce__countdown mono">noch {formatCountdown(Date.parse(banner.countdownTo) - now.getTime())}</span>
      )}
    </span>
  );
}
