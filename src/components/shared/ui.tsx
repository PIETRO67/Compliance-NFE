"use client";
import {
  useEffect,
  useId,
  useRef,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} id={id + "-label"}>
        {label}
      </label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            id,
            "aria-labelledby": id + "-label",
            "aria-invalid": !!error,
            "aria-describedby": error
              ? id + "-error"
              : hint
                ? id + "-hint"
                : undefined,
          })
        : children}
      {hint && <small id={id + "-hint"}>{hint}</small>}
      {error && (
        <small className="field-error" id={id + "-error"} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`badge ${/Cancel|expirado|Erro|Alta/.test(String(children)) ? "danger" : ""}`}
    >
      {children}
    </span>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current
      ?.querySelector<HTMLElement>("button,input,select,textarea")
      ?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-overlay" onClick={close}>
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close icon secondary"
          aria-label="Fechar diálogo"
          onClick={close}
        >
          <X size={18} />
        </button>
        <h2 id={titleId}>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children || (
        <p>
          Nenhum registro neste contexto. Ajuste os filtros ou crie um exemplo
          demonstrativo.
        </p>
      )}
    </div>
  );
}
export function DemoBanner() {
  return (
    <div className="demo-banner">
      AMBIENTE DE DEMONSTRAÇÃO — NÃO EMITE NOTAS FISCAIS{" "}
      <span>Simulação local · Não conectado</span>
    </div>
  );
}
