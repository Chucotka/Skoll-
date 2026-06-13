import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserDTO, UserStats } from '@toastup/shared';
import { api, setToken, getToken } from './lib/api';
import { getDevUser, getWebApp, isInTelegram, getStartParam } from './lib/telegram';

export type Screen = 'loading' | 'age_gate' | 'home' | 'create' | 'room' | 'profile';

interface AppContextValue {
  screen: Screen;
  user: UserDTO | null;
  stats: UserStats | null;
  currentRoomId: string | null;
  pendingInvite: string | null;
  error: string | null;
  navigate: (screen: Screen, roomId?: string | null) => void;
  confirmAge: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (u: UserDTO) => void;
  clearPendingInvite: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('loading');
  const [user, setUserState] = useState<UserDTO | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback((next: Screen, roomId?: string | null) => {
    if (roomId !== undefined) setCurrentRoomId(roomId);
    setScreen(next);
  }, []);

  const refreshMe = useCallback(async () => {
    const res = await api.me();
    setUserState(res.user);
    setStats(res.stats);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      // Capture an invite code from a deep link (?startapp=CODE or start_param).
      const start = getStartParam();
      if (start) setPendingInvite(start.replace(/^join_/, ''));

      if (!getToken()) {
        const wa = getWebApp();
        if (isInTelegram() && wa) {
          const auth = await api.authTelegram({ initData: wa.initData });
          setToken(auth.token);
        } else {
          // Browser dev login (server must have ALLOW_DEV_AUTH=true).
          const auth = await api.authTelegram({ devUser: getDevUser() });
          setToken(auth.token);
        }
      }

      const res = await api.me();
      setUserState(res.user);
      setStats(res.stats);
      setScreen(res.user.isAdultConfirmed ? 'home' : 'age_gate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
      setScreen('age_gate');
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const confirmAge = useCallback(async () => {
    const res = await api.updateMe({ isAdultConfirmed: true });
    setUserState(res.user);
    setScreen('home');
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserState(null);
    setStats(null);
    setScreen('age_gate');
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      screen,
      user,
      stats,
      currentRoomId,
      pendingInvite,
      error,
      navigate,
      confirmAge,
      refreshMe,
      setUser: setUserState,
      clearPendingInvite: () => setPendingInvite(null),
      logout,
    }),
    [screen, user, stats, currentRoomId, pendingInvite, error, navigate, confirmAge, refreshMe, logout],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
