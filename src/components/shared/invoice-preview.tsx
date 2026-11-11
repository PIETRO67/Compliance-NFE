"use client";
import type { Draft, Invoice } from "../../domain/models";
import { useDemo } from "../../demo/DemoProvider";
import { currency, displayDate, watermark } from "../../lib/formatters";
export function DemoInvoicePreview({
  invoice,
  draft,
}: {
  invoice?: Invoice;
  draft?: Draft;
}) {
  const { state } = useDemo();
  const company = state.companies.find(
    (c) => c.id === (invoice?.companyId || draft?.companyId),
  );
  const recipient = state.recipients.find(
    (t) => t.id === (invoice?.recipientId || draft?.recipientId),
  );
  return (
    <article className="document demo-document">
      <div className="document-watermark">SEM VALIDADE FISCAL</div>
      <span className="eyebrow">PRÉVIA EMPRESARIAL ILUSTRATIVA</span>
      <h2>Documento de serviços DEMO</h2>
      <div className="warning">{watermark}</div>
      <p>
        Referência interna:{" "}
        {invoice?.id || "RASCUNHO DEMO — sem numeração fiscal"}
      </p>
      <hr />
      <div className="document-parties">
        <div>
          <small>PRESTADOR FICTÍCIO</small>
          <h3>{company?.name}</h3>
          <p>{company?.document}</p>
          <p>{company?.city}</p>
        </div>
        <div>
          <small>TOMADOR FICTÍCIO</small>
          <h3>{recipient?.name || "A selecionar"}</h3>
          <p>{recipient?.document}</p>
        </div>
      </div>
      <hr />
      <p>
        {invoice?.description ||
          draft?.description ||
          "Descrição demonstrativa do serviço"}
      </p>
      <p>Competência: {displayDate(invoice?.date || draft?.date || "")}</p>
      <div className="total">
        <span>Valor demonstrativo</span>
        <strong>
          {currency(
            invoice?.value ??
              Number(draft?.value || 0) - Number(draft?.discount || 0),
          )}
        </strong>
      </div>
      <p className="muted">
        Sem selo, chave de acesso, QR code, protocolo, assinatura ou conexão
        governamental.
      </p>
      <strong className="document-footer">{watermark}</strong>
    </article>
  );
}
