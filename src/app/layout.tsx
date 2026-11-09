import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'IA Compliance | NFS-e Demo',description:'Plataforma Inteligente de Emissão e Gestão de Serviços — protótipo demonstrativo sem validade fiscal'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
