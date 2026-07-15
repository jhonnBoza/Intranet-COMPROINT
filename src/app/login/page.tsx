"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error ?? "No se pudo iniciar sesión."); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--canvas)] px-4 py-12">
      <div className="w-full max-w-[380px]">
        {/* Marca */}
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={44} />
          <span className="mt-2.5 h-[3px] w-5 rounded-full bg-gold-400" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold tracking-[0.12em] text-ink-900">COMPROINT</p>
          <p className="mt-0.5 text-2xs uppercase tracking-[0.18em] text-slate-400">Sistema de Gestión Documental</p>
        </div>

        {/* Tarjeta */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-panel">
          <h1 className="text-base font-semibold text-slate-800">Iniciar sesión</h1>
          <p className="mt-0.5 text-sm text-slate-500">Ingresa con tu cuenta corporativa.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Usuario / Correo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@comproint.com" required
                  className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-estado-obsoleto">{error}</p>}

            <button
              type="submit" disabled={cargando}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink-900 text-sm font-medium text-white transition hover:bg-ink-800 disabled:opacity-60"
            >
              {cargando ? <Loader2 size={16} className="animate-spin" /> : <>Ingresar <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-2xs uppercase tracking-wider text-slate-400">
          © 2026 COMPROINT · Uso interno exclusivo
        </p>
      </div>
    </div>
  );
}
