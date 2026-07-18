"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Monta su contenido directamente sobre <body>.
 *
 * Sin esto, un modal declarado dentro de un contenedor con `space-y-*` hereda
 * un `margin-top` (Tailwind aplica el margen a todos los hijos menos el
 * primero), y aunque sea `fixed inset-0` queda desplazado hacia abajo: el velo
 * no llega a cubrir la franja superior de la pantalla.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return createPortal(children, document.body);
}
