import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from './client';
import { keys } from './queries';
import type { Me, MyEvent, Profile, RegisterRequest, RegistrationRequest, TournamentDetail } from './types';

export const authKeys = {
  me: ['auth', 'me'] as const,
  myEvent: ['auth', 'my-event'] as const,
  profile: ['auth', 'profile'] as const,
};

/** The logged-in account, or null for visitors. Never throws for 401. */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        // 204 = visitor without session
        return (await api.get<Me | undefined>('/api/auth/me')) ?? null;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useMyEvent(enabled: boolean) {
  return useQuery({
    queryKey: authKeys.myEvent,
    queryFn: () => api.get<MyEvent>('/api/me/event'),
    enabled,
    staleTime: 15_000,
  });
}

function useAfterAuth() {
  const client = useQueryClient();
  return (me: Me | null) => {
    client.setQueryData(authKeys.me, me);
    client.removeQueries({ queryKey: authKeys.myEvent });
    client.removeQueries({ queryKey: authKeys.profile });
    client.removeQueries({ queryKey: ['admin'] });
  };
}

export function useLogin() {
  const after = useAfterAuth();
  return useMutation({
    mutationFn: (body: { login: string; password: string }) => api.post<Me>('/api/auth/login', body),
    onSuccess: after,
  });
}

export function useRegisterAccount() {
  const after = useAfterAuth();
  return useMutation({
    mutationFn: (body: RegisterRequest) => api.post<Me>('/api/auth/register', body),
    onSuccess: after,
  });
}

export function useLogout() {
  const after = useAfterAuth();
  return useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout'),
    onSettled: () => after(null),
  });
}

export function useProfile() {
  const client = useQueryClient();
  return {
    query: useQuery({ queryKey: authKeys.profile, queryFn: () => api.get<Profile>('/api/me/profile') }),
    save: useMutation({
      mutationFn: (body: Profile) => api.put<Me>('/api/me/profile', body),
      onSuccess: (me) => {
        client.setQueryData(authKeys.me, me);
        client.invalidateQueries({ queryKey: authKeys.profile });
        client.invalidateQueries({ queryKey: keys.seats });
      },
    }),
    password: useMutation({
      mutationFn: (body: { currentPassword: string; newPassword: string }) => api.put<void>('/api/me/password', body),
    }),
  };
}

export function useSeatActions() {
  const client = useQueryClient();
  const done = (my: MyEvent) => {
    client.setQueryData(authKeys.myEvent, my);
    client.invalidateQueries({ queryKey: keys.seats });
  };
  return {
    reserve: useMutation({
      mutationFn: ({ label, companions }: { label: string; companions?: string }) =>
        api.post<MyEvent>(`/api/me/seat/${encodeURIComponent(label)}`, { companions }),
      onSuccess: done,
    }),
    cancel: useMutation({ mutationFn: () => api.del<MyEvent>('/api/me/seat'), onSuccess: done }),
  };
}

export function useTournamentSignup(tournamentId: number | null) {
  const client = useQueryClient();
  const done = (detail: TournamentDetail) => {
    client.setQueryData(keys.tournament(detail.summary.id), detail);
    client.invalidateQueries({ queryKey: keys.tournaments });
    client.invalidateQueries({ queryKey: authKeys.myEvent });
  };
  return {
    register: useMutation({
      mutationFn: (body: RegistrationRequest) => api.post<TournamentDetail>(`/api/me/tournaments/${tournamentId}`, body),
      onSuccess: done,
    }),
    withdraw: useMutation({
      mutationFn: () => api.del<TournamentDetail>(`/api/me/tournaments/${tournamentId}`),
      onSuccess: done,
    }),
  };
}
