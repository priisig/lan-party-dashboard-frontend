import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  AdminPrincipal,
  AdminTournament,
  AdminUser,
  AdminWithCode,
  AnnouncementDto,
  CreateEventRequest,
  EventRequest,
  EventView,
  InfoItem,
  IntegrationRequest,
  IntegrationView,
  LayoutRequest,
  PendingRequest,
  ProviderInfo,
  ScheduleDto,
  SeatMapView,
  ServerDto,
  SettingsView,
  TestResult,
  TournamentRequest,
} from '../api/types';

const base = (eventId: number) => `/api/admin/events/${eventId}`;

export const adminKeys = {
  me: ['admin', 'me'] as const,
  events: ['admin', 'events'] as const,
  event: (id: number) => ['admin', 'event', id] as const,
  list: (id: number, what: string) => ['admin', 'event', id, what] as const,
  settings: ['admin', 'settings'] as const,
  admins: ['admin', 'admins'] as const,
  types: ['admin', 'integration-types'] as const,
};

export const useMe = () =>
  useQuery({ queryKey: adminKeys.me, queryFn: () => api.get<AdminPrincipal>('/api/auth/me'), retry: false, staleTime: 60_000 });

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<AdminPrincipal>('/api/auth/login', { code }),
    onSuccess: (me) => client.setQueryData(adminKeys.me, me),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout'),
    onSettled: () => {
      client.removeQueries({ queryKey: ['admin'] });
    },
  });
}

export const useEvents = () => useQuery({ queryKey: adminKeys.events, queryFn: () => api.get<EventView[]>('/api/admin/events') });

/** Generic "list edited as a whole" resource (infos, announcements, servers, schedule). */
function useListResource<T>(eventId: number, what: string) {
  const client = useQueryClient();
  const key = adminKeys.list(eventId, what);
  const query = useQuery({ queryKey: key, queryFn: () => api.get<T[]>(`${base(eventId)}/${what}`) });
  const save = useMutation({
    mutationFn: (items: T[]) => api.put<T[]>(`${base(eventId)}/${what}`, items),
    onSuccess: (items) => client.setQueryData(key, items),
  });
  return { query, save };
}

export const useInfos = (eventId: number) => useListResource<InfoItem>(eventId, 'infos');
export const useAnnouncements = (eventId: number) => useListResource<AnnouncementDto>(eventId, 'announcements');
export const useServersAdmin = (eventId: number) => useListResource<ServerDto>(eventId, 'servers');
export const useScheduleAdmin = (eventId: number) => useListResource<ScheduleDto>(eventId, 'schedule');

export function useEventMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['admin'] });
  return {
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: EventRequest }) => api.put<EventView>(`/api/admin/events/${id}`, body),
      onSuccess: refresh,
    }),
    create: useMutation({
      mutationFn: (body: CreateEventRequest) => api.post<EventView>('/api/admin/events', body),
      onSuccess: refresh,
    }),
    activate: useMutation({
      mutationFn: (id: number) => api.post<EventView>(`/api/admin/events/${id}/activate`),
      onSuccess: () => {
        refresh();
        client.invalidateQueries();
      },
    }),
    remove: useMutation({ mutationFn: (id: number) => api.del(`/api/admin/events/${id}`), onSuccess: refresh }),
    uploadLogo: useMutation({
      mutationFn: ({ id, file }: { id: number; file: File }) => {
        const form = new FormData();
        form.append('file', file);
        return api.post<EventView>(`/api/admin/events/${id}/logo`, form);
      },
      onSuccess: refresh,
    }),
    removeLogo: useMutation({ mutationFn: (id: number) => api.del<EventView>(`/api/admin/events/${id}/logo`), onSuccess: refresh }),
  };
}

export function useTournamentsAdmin(eventId: number) {
  const client = useQueryClient();
  const key = adminKeys.list(eventId, 'tournaments');
  const setList = (list: AdminTournament[]) => client.setQueryData(key, list);
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const url = `${base(eventId)}/tournaments`;
  return {
    query: useQuery({ queryKey: key, queryFn: () => api.get<AdminTournament[]>(url) }),
    create: useMutation({ mutationFn: (body: TournamentRequest) => api.post<AdminTournament>(url, body), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: TournamentRequest }) => api.put<AdminTournament>(`${url}/${id}`, body),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.del(`${url}/${id}`), onSuccess: refresh }),
    sync: useMutation({ mutationFn: (id: number) => api.post<AdminTournament[]>(`${url}/${id}/sync`), onSuccess: setList }),
    start: useMutation({ mutationFn: (id: number) => api.post<AdminTournament[]>(`${url}/${id}/start`), onSuccess: setList }),
    removeRegistration: useMutation({
      mutationFn: ({ id, registrationId }: { id: number; registrationId: number }) =>
        api.del<AdminTournament[]>(`${url}/${id}/registrations/${registrationId}`),
      onSuccess: setList,
    }),
  };
}

export function useSeatsAdmin(eventId: number) {
  const client = useQueryClient();
  const key = adminKeys.list(eventId, 'seats');
  const pendingKey = adminKeys.list(eventId, 'seat-requests');
  const url = `${base(eventId)}/seats`;
  const setMap = (map: SeatMapView) => client.setQueryData(key, map);
  const setPending = (list: PendingRequest[]) => {
    client.setQueryData(pendingKey, list);
    client.invalidateQueries({ queryKey: key });
  };
  return {
    map: useQuery({ queryKey: key, queryFn: () => api.get<SeatMapView>(url) }),
    pending: useQuery({ queryKey: pendingKey, queryFn: () => api.get<PendingRequest[]>(`${url}/requests`) }),
    layout: useMutation({ mutationFn: (body: LayoutRequest) => api.put<SeatMapView>(`${url}/layout`, body), onSuccess: setMap }),
    assign: useMutation({
      mutationFn: ({ label, gamertag, note }: { label: string; gamertag: string; note: string }) =>
        api.put<SeatMapView>(`${url}/${encodeURIComponent(label)}`, { gamertag, note }),
      onSuccess: setMap,
    }),
    block: useMutation({ mutationFn: (label: string) => api.post<SeatMapView>(`${url}/${encodeURIComponent(label)}/block`), onSuccess: setMap }),
    release: useMutation({
      mutationFn: (label: string) => api.post<SeatMapView>(`${url}/${encodeURIComponent(label)}/release`),
      onSuccess: setMap,
    }),
    approve: useMutation({ mutationFn: (id: number) => api.post<PendingRequest[]>(`${url}/requests/${id}/approve`), onSuccess: setPending }),
    reject: useMutation({ mutationFn: (id: number) => api.post<PendingRequest[]>(`${url}/requests/${id}/reject`), onSuccess: setPending }),
  };
}

export function useIntegrationsAdmin(eventId: number) {
  const client = useQueryClient();
  const key = adminKeys.list(eventId, 'integrations');
  const url = `${base(eventId)}/integrations`;
  const refresh = () => client.invalidateQueries({ queryKey: key });
  return {
    types: useQuery({ queryKey: adminKeys.types, queryFn: () => api.get<ProviderInfo[]>('/api/admin/integration-types'), staleTime: Infinity }),
    query: useQuery({ queryKey: key, queryFn: () => api.get<IntegrationView[]>(url) }),
    create: useMutation({ mutationFn: (body: IntegrationRequest) => api.post<IntegrationView>(url, body), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: IntegrationRequest }) => api.put<IntegrationView>(`${url}/${id}`, body),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.del(`${url}/${id}`), onSuccess: refresh }),
    test: useMutation({
      mutationFn: ({ id, body }: { id: number | null; body: IntegrationRequest }) =>
        api.post<TestResult>(`${url}/test${id != null ? `?id=${id}` : ''}`, body),
    }),
  };
}

export function useSettings() {
  const client = useQueryClient();
  const set = (s: SettingsView) => client.setQueryData(adminKeys.settings, s);
  return {
    query: useQuery({ queryKey: adminKeys.settings, queryFn: () => api.get<SettingsView>('/api/admin/settings') }),
    saveChallonge: useMutation({ mutationFn: (apiKey: string) => api.put<SettingsView>('/api/admin/settings/challonge', { apiKey }), onSuccess: set }),
    regeneratePushToken: useMutation({ mutationFn: () => api.post<SettingsView>('/api/admin/settings/push-token'), onSuccess: set }),
  };
}

export function useAdmins() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: adminKeys.admins });
  return {
    query: useQuery({ queryKey: adminKeys.admins, queryFn: () => api.get<AdminUser[]>('/api/admin/admins') }),
    create: useMutation({ mutationFn: (name: string) => api.post<AdminWithCode>('/api/admin/admins', { name }), onSuccess: refresh }),
    regenerate: useMutation({ mutationFn: (id: number) => api.post<AdminWithCode>(`/api/admin/admins/${id}/code`), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: number) => api.del(`/api/admin/admins/${id}`), onSuccess: refresh }),
  };
}
