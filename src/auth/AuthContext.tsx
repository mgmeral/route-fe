import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, clearAuthCredential, parseJson, setAuthToken, setBasicCredential } from '../api/fetcher';
import type { Role, User } from '../types';

type AuthContextValue = {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setRole: (role: Role) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface LoginResponse {
  username?: string;
  role?: Role;
  token?: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/login', {
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
    const backendRole = data?.role;

    if (!backendRole) {
      throw new ApiError('Login response does not include role.', 500, data);
    }

    if (data?.token) {
      setAuthToken(data.token);
    } else {
      const encodedBasic = btoa(`${username}:${password}`);
      setBasicCredential(encodedBasic);
    }

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
