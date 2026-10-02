import { createContext, useContext } from 'react';
import type { AdminPrincipal, EventView } from '../api/types';

export interface AdminContextValue {
  me: AdminPrincipal;
  events: EventView[];
  /** The event being edited – defaults to the active one, admins can switch to prepare next year. */
  event: EventView;
  selectEvent: (id: number) => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin outside AdminContext');
  return value;
}
