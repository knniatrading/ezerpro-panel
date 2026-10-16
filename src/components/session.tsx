"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import type { Me } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; user: Me };

interface SessionValue {
  state: State;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (body: { kind?: string; host?: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api<Me>("/auth/me")
      .then((user) => {
        if (!cancelled) setState({ status: "in", user });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "out" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const demoLogin = useCallback(async (body: { kind?: string; host?: string; role?: string }) => {
    await api("/demo/login", { method: "POST", body: JSON.stringify(body) });
    const user = await api<Me>("/auth/me");
    setState({ status: "in", user });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    try {
      const user = await api<Me>("/auth/me");
      setState({ status: "in", user });
    } catch {
      throw new ApiError(
        0,
        "Tus datos son correctos, pero el navegador no guardó la sesión. Activa las cookies para este sitio e inténtalo de nuevo.",
      );
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* si falla, igual se cierra la sesión en pantalla */
    }
    setState({ status: "out" });
  }, []);

  const reloadUser = useCallback(async () => {
    try {
      const user = await api<Me>("/auth/me");
      setState({ status: "in", user });
    } catch {
      /* si falla, se queda con lo que había */
    }
  }, []);

  const value = useMemo(
    () => ({ state, login, demoLogin, logout, reloadUser }),
    [state, login, demoLogin, logout, reloadUser],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
