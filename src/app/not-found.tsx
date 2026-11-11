import Link from "next/link";
export default function NotFound() {
  return (
    <main className="boot">
      <strong>IA COMPLIANCE</strong>
      <h1>Página não encontrada</h1>
      <p>Este caminho não pertence ao protótipo demonstrativo.</p>
      <Link className="button" href="/">
        Voltar à demonstração
      </Link>
    </main>
  );
}
