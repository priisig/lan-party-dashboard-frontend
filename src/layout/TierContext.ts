import { createContext, useContext } from 'react';
import type { Tier } from '../hooks/useLayoutTier';

export interface LayoutContextValue {
  tier: Tier;
  kiosk: boolean;
}

export const LayoutContext = createContext<LayoutContextValue>({ tier: 'wall', kiosk: false });

export const useLayout = () => useContext(LayoutContext);
