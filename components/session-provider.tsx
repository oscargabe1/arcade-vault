"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SavedScore, SessionUser } from "@/lib/data";

type SessionContextValue = {
  user: SessionUser | null;
  login: (u: SessionUser | null) => void;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Primer render "sin sesión" para evitar mismatch de hidratación; av_user se lee tras montar.
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("av_user") || "null") as SessionUser | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(stored);
    } catch {}
  }, []);

  const login = useCallback((u: SessionUser | null) => {
    setUser(u);
    try {
      localStorage.setItem("av_user", JSON.stringify(u));
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem("av_user");
    } catch {}
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const all = JSON.parse(localStorage.getItem("av_scores") || "[]") as SavedScore[];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(all));
    } catch {}
  }, []);

  const value = useMemo(() => ({ user, login, signOut, saveScore }), [user, login, signOut, saveScore]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
