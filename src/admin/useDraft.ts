import { useEffect, useState } from 'react';

/**
 * Local editable copy of server data. The copy follows the server while untouched and stays put
 * once the admin starts editing, until saved or reset.
 */
export function useDraft<T>(source: T | undefined, fallback: T) {
  const [draft, setDraftState] = useState<T>(source ?? fallback);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty && source !== undefined) setDraftState(source);
  }, [source, dirty]);

  const setDraft = (next: T | ((prev: T) => T)) => {
    setDirty(true);
    setDraftState(next);
  };
  const reset = (value?: T) => {
    setDirty(false);
    setDraftState(value ?? source ?? fallback);
  };
  return { draft, setDraft, dirty, reset };
}
