// Marca COMPROINT — logo real (engranaje industrial) + wordmark.

export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="COMPROINT"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

export function Logo({
  variant = "dark",
  showTagline = true,
}: {
  variant?: "dark" | "light";
  showTagline?: boolean;
}) {
  const titulo = variant === "dark" ? "text-white" : "text-ink-900";
  const tag = variant === "dark" ? "text-brand-300" : "text-slate-500";
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <p className={`text-[15px] font-bold tracking-[0.14em] ${titulo}`}>COMPROINT</p>
        {showTagline && (
          <p className={`mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] ${tag}`}>
            <span className="h-1 w-1 rounded-full bg-gold-400" aria-hidden="true" />
            Gestión Documental
          </p>
        )}
      </div>
    </div>
  );
}
