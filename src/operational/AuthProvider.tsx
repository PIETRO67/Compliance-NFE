"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, setCsrf, type Identity } from "./api";
interface AuthValue {
  identity: Identity | null;
  ready: boolean;
  error: string;
  companyId: string;
  selectCompany: (id: string) => void;
  setIdentity: (identity: Identity | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setState] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [companyId, setCompany] = useState("");
  const setIdentity = useCallback((value: Identity | null) => {
    setState(value);
    setCsrf(value?.csrf_token || "");
    setCompany((previous) =>
      value?.companies.some((c) => c.id === previous)
        ? previous
        : value?.companies[0]?.id || "",
    );
  }, []);
  const refresh = useCallback(async () => {
    try {
      const value = await api<Identity>("/me");
      setIdentity(value);
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setIdentity(null);
        setError("");
      } else {
        setError(e instanceof Error ? e.message : "Backend indisponível.");
      }
    } finally {
      setReady(true);
    }
  }, [setIdentity]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        identity,
        ready,
        error,
        companyId,
        selectCompany: (id) => {
          if (identity?.companies.some((c) => c.id === id)) setCompany(id);
        },
        setIdentity,
        refresh,
        logout: async () => {
          await api("/auth/logout", { method: "POST", body: {} });
          setIdentity(null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const c = useContext(Context);
  if (!c) throw new Error("AuthProvider ausente");
  return c;
}
