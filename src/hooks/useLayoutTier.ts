import { useEffect, useState } from 'react';

export type Tier = 'wall' | 'laptop' | 'mobile';

export const WALL_MIN = 1600;
export const LAPTOP_MIN = 1024;

export function tierFor(width: number, forceWall: boolean): Tier {
  if (forceWall || width >= WALL_MIN) return 'wall';
  if (width >= LAPTOP_MIN) return 'laptop';
  return 'mobile';
}

/** Computes the layout tier and mirrors it to <html data-tier> where the CSS picks it up. */
export function useLayoutTier(forceWall: boolean): Tier {
  const [tier, setTier] = useState<Tier>(() => tierFor(window.innerWidth, forceWall));
  useEffect(() => {
    const update = () => setTier(tierFor(window.innerWidth, forceWall));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [forceWall]);
  useEffect(() => {
    document.documentElement.dataset.tier = tier;
  }, [tier]);
  return tier;
}
