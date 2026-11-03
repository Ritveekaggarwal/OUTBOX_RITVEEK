import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints';
import { UNAUTHORIZED_EVENT } from '../api/http';
import { queryKeys } from '../api/query-keys';
import type { User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const setUser = useCallback((user: User) => client.setQueryData(queryKeys.me, user), [client]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    client.clear();
    client.setQueryData(queryKeys.me, null);
  }, [client]);

  // Any 401 from the API (expired cookie) drops the user back to the login screen.
  useEffect(() => {
    const onUnauthorized = () => client.setQueryData(queryKeys.me, null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [client]);

  const value = useMemo(
    () => ({ user: data ?? null, loading: isPending, setUser, logout }),
    [data, isPending, setUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
