import { useRouter, useSegments } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { leaveRepository } from '@/src/repositories/leaveRepository';
import { attendanceRepository } from '@/src/repositories/attendanceRepository';
import {
  changePasswordApi,
  fetchMemberships,
  type CompanyMembership,
} from '@/src/services/apiClient';
import {
  clearStoredCompanyId,
  getStoredCompanyId,
  setStoredCompanyId,
} from '@/src/services/companyStorage';
import {
  getCurrentUser,
  loginWithEmail,
  logout as logoutRequest,
  registerWithEmail,
  toErrorMessage,
  type AuthUser,
} from '@/src/services/authService';

export type AuthGate = 'loading' | 'login' | 'change_password' | 'select_company' | 'ready';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authGate: AuthGate;
  selectedCompanyId: string | null;
  memberships: CompanyMembership[];
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  selectCompany: (companyId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function hydrateUserData(user: AuthUser, companyId: string | null) {
  attendanceRepository.setUserId(user.$id);
  attendanceRepository.setCompanyId(companyId);
  leaveRepository.setCompanyId(companyId);
  await attendanceRepository.ensureProfileForUser({
    userId: user.$id,
    name: user.name || user.email,
    email: user.email,
  });
}

async function resolveAuthGate(params: {
  user: AuthUser;
  memberships: CompanyMembership[];
  storedCompanyId: string | null;
}): Promise<{ gate: AuthGate; companyId: string | null; mustChangePassword: boolean }> {
  const mustChange = params.memberships.some((m) => m.mustChangePassword);
  if (mustChange) {
    return { gate: 'change_password', companyId: null, mustChangePassword: true };
  }

  const activeIds = new Set(params.memberships.map((m) => m.companyId));
  const stored =
    params.storedCompanyId && activeIds.has(params.storedCompanyId)
      ? params.storedCompanyId
      : null;

  if (params.memberships.length > 1 && !stored) {
    return { gate: 'select_company', companyId: null, mustChangePassword: false };
  }

  const companyId = stored || params.memberships[0]?.companyId || null;
  if (companyId) {
    await setStoredCompanyId(companyId);
  }

  return { gate: 'ready', companyId, mustChangePassword: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authGate, setAuthGate] = useState<AuthGate>('loading');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const applyGate = useCallback(
    async (current: AuthUser) => {
      const [rows, storedCompanyId] = await Promise.all([
        fetchMemberships(),
        getStoredCompanyId(),
      ]);
      if (rows.length === 0) {
        throw new Error('No employee record found. Ask your HR admin to provision your account.');
      }

      const resolved = await resolveAuthGate({
        user: current,
        memberships: rows,
        storedCompanyId,
      });

      setMemberships(rows);
      setMustChangePassword(resolved.mustChangePassword);
      setSelectedCompanyId(resolved.companyId);
      setAuthGate(resolved.gate);

      if (resolved.gate === 'ready' && resolved.companyId) {
        await hydrateUserData(current, resolved.companyId);
      }
    },
    [],
  );

  const refreshSession = useCallback(async () => {
    const current = await getCurrentUser();
    if (current) {
      await applyGate(current);
      setUser(current);
    } else {
      attendanceRepository.setUserId(null);
      attendanceRepository.setCompanyId(null);
      leaveRepository.setCompanyId(null);
      setUser(null);
      setAuthGate('login');
      setMemberships([]);
      setSelectedCompanyId(null);
      setMustChangePassword(false);
    }
  }, [applyGate]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const current = await getCurrentUser();
        if (!mounted) return;
        if (current) {
          await applyGate(current);
          if (!mounted) return;
          setUser(current);
        } else {
          setAuthGate('login');
        }
      } catch {
        if (mounted) {
          setAuthGate('login');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [applyGate]);

  useEffect(() => {
    if (isLoading || authGate === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (authGate === 'login' && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (authGate === 'change_password') {
      const onChangePassword = segments[1] === 'change-password';
      if (!onChangePassword) {
        router.replace('/(auth)/change-password');
      }
      return;
    }

    if (authGate === 'select_company') {
      const onSelectCompany = segments[1] === 'select-company';
      if (!onSelectCompany) {
        router.replace('/(auth)/select-company');
      }
      return;
    }

    if (authGate === 'ready' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [authGate, segments, isLoading, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const current = await loginWithEmail(email, password);
      await applyGate(current);
      setUser(current);
    },
    [applyGate],
  );

  const register = useCallback(
    async (params: { name: string; email: string; password: string }) => {
      const current = await registerWithEmail(params);
      await applyGate(current);
      setUser(current);
    },
    [applyGate],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    await clearStoredCompanyId();
    attendanceRepository.setUserId(null);
    attendanceRepository.setCompanyId(null);
    leaveRepository.setCompanyId(null);
    setUser(null);
    setAuthGate('login');
    setMemberships([]);
    setSelectedCompanyId(null);
    setMustChangePassword(false);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error('Not signed in');
      await changePasswordApi({ currentPassword, newPassword });
      await applyGate(user);
    },
    [applyGate, user],
  );

  const selectCompany = useCallback(
    async (companyId: string) => {
      if (!user) throw new Error('Not signed in');
      await setStoredCompanyId(companyId);
      setSelectedCompanyId(companyId);
      setAuthGate('ready');
      await hydrateUserData(user, companyId);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user && authGate === 'ready',
      authGate,
      selectedCompanyId,
      memberships,
      mustChangePassword,
      login,
      register,
      logout,
      refreshSession,
      changePassword,
      selectCompany,
    }),
    [
      user,
      isLoading,
      authGate,
      selectedCompanyId,
      memberships,
      mustChangePassword,
      login,
      register,
      logout,
      refreshSession,
      changePassword,
      selectCompany,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { toErrorMessage };
