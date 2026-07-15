import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMPROINT · Sistema de Gestión Documental",
  description: "Intranet corporativa COMPROINT — gestión documental por áreas y jerarquías.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
