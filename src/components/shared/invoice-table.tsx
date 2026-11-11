"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowUpRight, Copy } from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import type { Invoice } from "../../domain/models";
import {
  currency,
  displayDate,
  csvCell,
  watermark,
  download,
} from "../../lib/formatters";
import { Badge, Empty } from "./ui";
export function invoiceHref(n: Invoice, portal: boolean) {
  return `${portal ? "/portal" : "/admin"}/notas/${/^DEMO-NFSE-\d{6}$/.test(n.id) ? n.id : "local?id=" + n.id}`;
}
export function exportInvoices(
  notes: Invoice[],
  companyName: (id: string) => string,
) {
  download(
    "documentos-DEMO.csv",
    watermark +
      "\n" +
      [
        "Referência",
        "CNPJ DEMO",
        "Empresa",
        "Competência",
        "Valor",
        "Situação",
        "Tipo",
      ]
        .map(csvCell)
        .join(";") +
      "\n" +
      notes
        .map((n) =>
          [
            n.id,
            n.companyId,
            companyName(n.companyId),
            displayDate(n.date),
            n.value.toFixed(2).replace(".", ","),
            n.status,
            n.received ? "Recebida fictícia" : "Emitida demo",
          ]
            .map(csvCell)
            .join(";"),
        )
        .join("\n"),
    "text/csv;charset=utf-8",
  );
}
export function InvoiceTable({
  notes,
  portal = false,
  compact = false,
  duplicate,
}: {
  notes: Invoice[];
  portal?: boolean;
  compact?: boolean;
  duplicate?: (n: Invoice) => void;
}) {
  const { state } = useDemo();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"date" | "asc" | "desc">("date");
  const fingerprint = notes.map((n) => n.id).join("|");
  useEffect(() => setPage(1), [fingerprint]);
  const sorted = [...notes].sort((a, b) =>
    sort === "asc"
      ? a.value - b.value
      : sort === "desc"
        ? b.value - a.value
        : b.date.localeCompare(a.date),
  );
  const visible = compact
    ? sorted.slice(0, 5)
    : sorted.slice((page - 1) * 8, page * 8);
  return (
    <>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">
            Documentos fictícios{" "}
            {portal ? "da empresa selecionada" : "do escritório"}
          </caption>
          <thead>
            <tr>
              <th>DOCUMENTO / TOMADOR</th>
              {!portal && <th>EMPRESA</th>}
              <th>COMPETÊNCIA</th>
              <th>
                <button
                  className="plain"
                  onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
                >
                  VALOR ↕
                </button>
              </th>
              <th>SITUAÇÃO</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((n) => (
              <tr key={n.id}>
                <td>
                  <Link className="table-link" href={invoiceHref(n, portal)}>
                    {state.recipients.find((t) => t.id === n.recipientId)
                      ?.name || "Tomador DEMO"}
                  </Link>
                  <small>{n.id}</small>
                </td>
                {!portal && (
                  <td>
                    {state.companies.find((c) => c.id === n.companyId)?.name}
                  </td>
                )}
                <td>{displayDate(n.date)}</td>
                <td className="amount">{currency(n.value)}</td>
                <td>
                  <Badge>{n.status}</Badge>
                </td>
                <td>
                  <div className="actions">
                    <Link
                      className="button secondary icon"
                      href={invoiceHref(n, portal)}
                      aria-label={`Ver ${n.id}`}
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                    {duplicate && (
                      <button
                        className="secondary icon"
                        aria-label={`Duplicar ${n.id} como rascunho`}
                        onClick={() => duplicate(n)}
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!notes.length && (
          <Empty title="Nenhuma nota encontrada">
            <p>Não há documentos neste CNPJ ou nos filtros escolhidos.</p>
          </Empty>
        )}
      </div>
      {!compact && (
        <div className="pagination">
          <span>{notes.length} documentos demonstrativos</span>
          <div className="actions">
            <button
              className="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              className="secondary"
              disabled={page * 8 >= notes.length}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </>
  );
}
