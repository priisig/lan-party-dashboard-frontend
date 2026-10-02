import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { topicKeys } from '../api/queries';

/**
 * Subscribes to backend change notifications (SSE) and refreshes the affected queries.
 * EventSource reconnects by itself; after a reconnect everything is refreshed since events may be missed.
 */
export function useEventStream() {
  const client = useQueryClient();
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/public/stream');
    let connectedBefore = false;
    source.addEventListener('hello', () => {
      if (connectedBefore) client.invalidateQueries();
      connectedBefore = true;
    });
    source.addEventListener('change', (e) => {
      try {
        const { topic } = JSON.parse((e as MessageEvent).data) as { topic: string };
        for (const key of topicKeys[topic] ?? []) {
          client.invalidateQueries({ queryKey: key });
        }
        if (topic === 'event' || topic === 'seats' || topic === 'tournaments') {
          client.invalidateQueries({ queryKey: ['admin'] });
        }
      } catch {
        client.invalidateQueries();
      }
    });
    return () => source.close();
  }, [client]);
}
