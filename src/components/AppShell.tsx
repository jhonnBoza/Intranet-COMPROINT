"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { FeedbackProvider } from "./Feedback";
import type { Area, UsuarioPublico } from "@/types";

export function AppShell({
  areas,
  user,
  children,
}: {
  areas: Area[];
  user: UsuarioPublico;
  children: React.ReactNode;
}) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  return (
    <FeedbackProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[color:var(--canvas)]">
        <Header user={user} onToggleSidebar={() => setSidebarAbierto((v) => !v)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar areas={areas} user={user} abierto={sidebarAbierto} onCerrar={() => setSidebarAbierto(false)} />

          <main className="flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</div>
            <Footer />
          </main>
        </div>
      </div>
    </FeedbackProvider>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-2xs text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© 2026 COMPROINT S.A. · Sistema de Gestión Documental · Uso interno exclusivo</p>
        <div className="flex items-center gap-4">
          <a href="mailto:soporte.ti@comproint.com" className="hover:text-brand-700">Soporte TI</a>
          <span className="text-slate-400">Anexo 100</span>
        </div>
      </div>
    </footer>
  );
}
