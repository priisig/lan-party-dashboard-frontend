import { useState } from 'react';
import { useBanners } from '../api/queries';
import type { Banner, BannerTone } from '../api/types';
import { AccentText } from '../components/AccentText';
import { Icon } from '../components/Icon';
import { useNow } from '../hooks/useNow';
import { formatCountdown } from '../lib/time';

const TAG: Record<BannerTone, string> = { LIVE: 'LIVE', INFO: 'INFO', WARNING: 'ACHTUNG' };
const DISMISSED_KEY = 'lan-dashboard.dismissed-banners';

function loadDismissed(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(DISMISSED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** Announcements under the header. Visitors can hide them for this tab; the beamer always shows them. */
export function AnnouncementBar({ dismissible }: { dismissible: boolean }) {
  const { data } = useBanners();
  const now = useNow(1000);
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);
  const banners = (data ?? []).filter(
    (b) => (!b.countdownTo || Date.parse(b.countdownTo) > now.getTime()) && !(dismissible && dismissed.includes(b.id + b.text)),
  );
  if (banners.length === 0) return null;

  const dismiss = (b: Banner) => {
    const next = [...dismissed, b.id + b.text];
    setDismissed(next);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // only a convenience
    }
  };

  return (
    <div className="announce" role="region" aria-label="Ankündigungen" aria-live="polite">
      {banners.map((b) => (
        <div key={b.id} className={`announce__row announce__row--${b.tone.toLowerCase()}`}>
          <div className="announce__inner">
            <span className="announce__tag">
              {b.tone === 'LIVE' && <span className="announce__dot" />}
              {TAG[b.tone]}
            </span>
            <span className="announce__text">
              <AccentText text={b.text} />
              {b.countdownTo && <span className="announce__countdown mono"> · noch {formatCountdown(Date.parse(b.countdownTo) - now.getTime())}</span>}
            </span>
            {dismissible && (
              <button type="button" className="ico announce__close" aria-label="Ankündigung ausblenden" onClick={() => dismiss(b)}>
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
