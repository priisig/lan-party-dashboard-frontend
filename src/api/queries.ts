import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { setServerTime } from '../lib/time';
import type {
  Banner,
  EventInfo,
  LiveTag,
  PublicServer,
  RegistrationRequest,
  ScheduleView,
  SeatMapView,
  StatsView,
  TournamentDetail,
  TournamentSummary,
} from './types';

/** Time-dependent data (status chips, banners) is re-fetched regularly even without push events. */
const TIME_BASED = 30_000;
/** Fallback refresh when the SSE connection is down. */
const FALLBACK = 60_000;

export const keys = {
  event: ['event'] as const,
  banners: ['banners'] as const,
  live: ['live'] as const,
  schedule: ['schedule'] as const,
  servers: ['servers'] as const,
  tournaments: ['tournaments'] as const,
  tournament: (id: number) => ['tournament', id] as const,
  seats: ['seats'] as const,
  stats: ['stats'] as const,
};

/** Maps backend change topics (realtime.Topic) to the queries that must be refreshed. */
export const topicKeys: Record<string, readonly (readonly unknown[])[]> = {
  event: [keys.event],
  banners: [keys.banners],
  schedule: [keys.schedule, keys.live],
  servers: [keys.servers],
  tournaments: [keys.tournaments, ['tournament'], keys.live, keys.banners],
  seats: [keys.seats],
  stats: [keys.stats],
};

async function fetchEventInfo(): Promise<EventInfo> {
  const sentAt = Date.now();
  const info = await api.get<EventInfo>('/api/public/event');
  // Assume symmetric latency: the server stamped the time halfway through the round trip.
  setServerTime(info.serverTime, (sentAt + Date.now()) / 2);
  return info;
}

export const useEventInfo = () =>
  useQuery({ queryKey: keys.event, queryFn: fetchEventInfo, refetchInterval: 5 * 60_000, retry: 1 });

export const useBanners = () =>
  useQuery({ queryKey: keys.banners, queryFn: () => api.get<Banner[]>('/api/public/banners'), refetchInterval: TIME_BASED });

export const useLive = () =>
  useQuery({ queryKey: keys.live, queryFn: () => api.get<LiveTag>('/api/public/live'), refetchInterval: TIME_BASED });

export const useSchedule = () =>
  useQuery({ queryKey: keys.schedule, queryFn: () => api.get<ScheduleView>('/api/public/schedule'), refetchInterval: TIME_BASED });

export const useServers = () =>
  useQuery({ queryKey: keys.servers, queryFn: () => api.get<PublicServer[]>('/api/public/servers'), refetchInterval: FALLBACK });

export const useTournaments = () =>
  useQuery({
    queryKey: keys.tournaments,
    queryFn: () => api.get<TournamentSummary[]>('/api/public/tournaments'),
    refetchInterval: TIME_BASED,
  });

export const useTournament = (id: number | null) =>
  useQuery({
    queryKey: keys.tournament(id ?? 0),
    queryFn: () => api.get<TournamentDetail>(`/api/public/tournaments/${id}`),
    enabled: id != null,
    refetchInterval: FALLBACK,
  });

export const useSeats = () =>
  useQuery({ queryKey: keys.seats, queryFn: () => api.get<SeatMapView>('/api/public/seats'), refetchInterval: FALLBACK });

export const useStats = () =>
  useQuery({ queryKey: keys.stats, queryFn: () => api.get<StatsView>('/api/public/stats'), refetchInterval: FALLBACK });

export function useRegister(tournamentId: number | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RegistrationRequest) =>
      api.post<TournamentDetail>(`/api/public/tournaments/${tournamentId}/registrations`, body),
    onSuccess: (detail) => {
      client.setQueryData(keys.tournament(detail.summary.id), detail);
      client.invalidateQueries({ queryKey: keys.tournaments });
    },
  });
}

export function useRequestSeat() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ label, gamertag, companions }: { label: string; gamertag: string; companions?: string }) =>
      api.post<SeatMapView>(`/api/public/seats/${encodeURIComponent(label)}/requests`, { gamertag, companions }),
    onSuccess: (map) => client.setQueryData(keys.seats, map),
  });
}
