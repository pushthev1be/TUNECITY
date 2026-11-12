// One titled card in a side panel. `accent` colours the title bar so the eye
// can find a section by colour; `badge` sits on the right of the title.
export function Section({ title, accent = 'var(--accent-yellow)', badge, children, className = '', collapsible = false, defaultOpen = true }) {
  const head = (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-1 h-3.5 rounded-sm" style={{ background: accent }} />
      <h3 className="flex-1 text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>{title}</h3>
      {badge}
      {collapsible && <span className="text-[var(--text-muted)] text-xs group-open:rotate-180 transition-transform">▾</span>}
    </div>
  )
  const card = `rounded-lg border border-[var(--panel-border)] bg-[var(--garage-bg)]/70 p-3 ${className}`
  if (collapsible) {
    return (
      <details className={`group ${card}`} open={defaultOpen}>
        <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">{head}</summary>
        {children}
      </details>
    )
  }
  return <section className={card}>{head}{children}</section>
}

export function CountBadge({ n, color = 'var(--accent-red)' }) {
  if (!n) return <span className="text-[10px] font-bold text-[var(--tag-positive)]">✓ NONE</span>
  return (
    <span className="min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center text-black" style={{ background: color }}>
      {n}
    </span>
  )
}
