/** localStorage for small per-viewer conveniences (remembered gamertag). Never required to work. */
export function loadPref(key: string): string {
  try {
    return window.localStorage.getItem('lan-dashboard.' + key) ?? '';
  } catch {
    return '';
  }
}

export function savePref(key: string, value: string) {
  try {
    window.localStorage.setItem('lan-dashboard.' + key, value);
  } catch {
    // ignore (private mode, blocked storage)
  }
}
