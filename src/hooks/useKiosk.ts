import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lan-dashboard.kiosk';

function readStorage(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStorage(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(STORAGE_KEY, '1');
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // private mode etc. – kiosk then only lasts for this page load
  }
}

/**
 * Kiosk mode for the beamer: enable with ?kiosk=1, disable with ?kiosk=0.
 * Remembered for the browser tab so in-app navigation keeps it.
 */
export function useKiosk(): boolean {
  const [kiosk] = useState(() => {
    const param = new URLSearchParams(window.location.search).get('kiosk');
    if (param !== null) {
      const on = param !== '0' && param !== 'false';
      writeStorage(on);
      return on;
    }
    return readStorage();
  });
  useEffect(() => {
    document.documentElement.classList.toggle('kiosk', kiosk);
  }, [kiosk]);
  return kiosk;
}
