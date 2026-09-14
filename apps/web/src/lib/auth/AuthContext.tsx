"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api, type User } from "@/lib/api/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<User | null> => {
    try {
      const currentUser = await api.me();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return null;
      }
      throw error;
    }
  };

  useEffect(() => {
    api.me()
      .then((currentUser) => setUser(currentUser))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          return;
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const authenticatedUser = await api.login({ email, password });
        setUser(authenticatedUser);
        return authenticatedUser;
      },
      register: async (name, email, password, passwordConfirmation) => {
        const authenticatedUser = await api.register({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        });
        setUser(authenticatedUser);
        return authenticatedUser;
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
      refreshUser,
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
