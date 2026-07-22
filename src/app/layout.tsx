import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Auto-hospedada por Next.js (se descarga en el build, se sirve desde el
// propio dominio): más rápido que Google Fonts por CDN y no necesita abrir
// el Content-Security-Policy a un origen externo.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "COMPROINT · Sistema de Gestión Documental",
  description: "Intranet corporativa COMPROINT — gestión documental por áreas y jerarquías.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
