"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { seed } from "../data/seed";
import { DemoRepository, uid } from "./DemoRepository";
import type { DemoState, Preferences } from "../domain/models";
interface DemoContextValue {
  state: DemoState;
  ready: boolean;
  notice: string;
  notify: (s: string) => void;
  mutate: (
    fn: (s: DemoState) => DemoState,
    message?: string,
    companyId?: string,
  ) => void;
  preferences: (value: Partial<Preferences>) => void;
  reset: () => void;
}
const Context = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(seed);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const result = DemoRepository.load(localStorage);
    setState(result.state);
    if (result.restored)
      setNotice(
        "Demonstração restaurada: o conteúdo local era antigo ou inválido.",
      );
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        DemoRepository.save(localStorage, state);
      } catch {
        setNotice(
          "Armazenamento indisponível. As alterações continuam somente em memória.",
        );
      }
  }, [state, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const handle = (e: StorageEvent) => {
      if (e.key === "ia-nfse-demo:v2") {
        const result = DemoRepository.load(localStorage);
        setState(result.state);
      }
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);
  const mutate = useCallback(
    (fn: (s: DemoState) => DemoState, message?: string, companyId = "") => {
      setState((previous) => {
        const next = fn(previous);
        return message
          ? {
              ...next,
              activities: [
                {
                  id: uid("ATIV-DEMO"),
                  companyId,
                  message,
                  at: new Date().toISOString(),
                },
                ...next.activities,
              ],
            }
          : next;
      });
      if (message) setNotice(message);
    },
    [],
  );
  const preferences = useCallback(
    (value: Partial<Preferences>) =>
      setState((s) => ({ ...s, preferences: { ...s.preferences, ...value } })),
    [],
  );
  return (
    <Context.Provider
      value={{
        state,
        ready,
        notice,
        notify: setNotice,
        mutate,
        preferences,
        reset: () => {
          setState(seed());
          setNotice("Demonstração restaurada neste navegador.");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const c = useContext(Context);
  if (!c) throw new Error("DemoProvider ausente.");
  return c;
}
