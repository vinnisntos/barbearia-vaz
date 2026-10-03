/**
 * Traços do símbolo da marca em uma caixa de 64×64: dois aros de óculos ligados na diagonal,
 * com a haste saindo do aro maior. Herda a cor do texto.
 */
export function TracosSimbolo() {
  return (
    <g fill="none" stroke="currentColor">
      {/* aro maior, com haste e ponta */}
      <circle cx="24" cy="40" r="12.5" strokeWidth="6" />
      <path d="M13.2 50.8 L4.5 59.5" strokeWidth="6" />
      <path d="M21 25.2 L18.6 13.5" strokeWidth="5" />
      {/* ponte e aro menor */}
      <path d="M34.6 29.4 L40.2 23.8" strokeWidth="5" />
      <circle cx="46" cy="18" r="7" strokeWidth="5" />
      <path d="M52.2 11.8 L58.5 5.5" strokeWidth="5" />
    </g>
  );
}

/** Símbolo da marca, decorativo: o nome vem sempre escrito ao lado. */
export function Simbolo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <TracosSimbolo />
    </svg>
  );
}
