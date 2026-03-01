import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, clearAuthCredential, parseJson, setAuthToken, setBasicCredential, apiFetch } from '../api/fetcher';
import type { Role, User } from '../types';

type AuthContextValue = {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setRole: (role: Role) => void;
};

// The backend currently returns role names in a format such as
// "ROLE_ADMIN" or "ROLE_USER".  Our front-end logic and `Role` type expect
// just the short form (`ADMIN`/`USER`), so we normalize here.  Future backends
// should ideally send the canonical form, but this helper keeps us robust.
const normalizeRole = (raw?: string): Role | null => {
  if (!raw) return null;
  const upper = raw.replace(/^ROLE_/, '').toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'USER') return 'USER';
  if (upper === 'AGENCY') return 'AGENCY';
  return null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface LoginResponse {
  username?: string;
  roles?: string[];
  token?: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // When the provider is mounted we attempt to restore the user from the
  // backend session.  The server should honour the existing cookie and
  // return either the authenticated user or a 401; either way we end up with a
  // consistent `currentUser` value for the rest of the app.
  useEffect(() => {
    (async () => {
      try {
        const u = await apiFetch<User>('/api/auth/me');
        // the server might also send the unnormalized role, so patch it here
        setCurrentUser({
          username: u.username,
          role: normalizeRole(u.role as string) ?? u.role as Role
        });
      } catch {
        // not logged in or endpoint unavailable – nothing to do
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const details = await parseJson(response);
      const message =
        typeof details === 'object' && details && 'message' in details
          ? String((details as { message: unknown }).message)
          : 'Login failed.';
      throw new ApiError(message, response.status, details);
    }

    const data = (await parseJson(response)) as LoginResponse | null;
    // map whatever the server gave us into our `Role` union
    const firstRole = data?.roles?.[0];
    const backendRole = normalizeRole(firstRole);

    if (!backendRole) {
      throw new ApiError(
        'Login response does not include a recognized role.',
        500,
        data
      );
    }

    if (data?.token) {
      setAuthToken(data.token);
    } else {
      const encodedBasic = btoa(`${username}:${password}`);
      setBasicCredential(encodedBasic);
    }

    // ensure that immediately after login we have a currentUser value; the
    // response may not contain the `username`/`role` fields in some auth
    // designs, so we call setCurrentUser explicitly rather than relying on the
    // effect above to run on the next render.
    setCurrentUser({
      username: data?.username?.trim() ? data.username : username,
      role: backendRole
    });

    setCurrentUser({
      username: data?.username?.trim() ? data.username : username,
      role: backendRole
    });
  };

  const logout = () => {
    clearAuthCredential();
    setCurrentUser(null);
  };

  const setRole = (role: Role) => {
    setCurrentUser((prev) => (prev ? { ...prev, role } : prev));
  };

  const value = useMemo(
    () => ({ currentUser, login, logout, setRole }),
    [currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
