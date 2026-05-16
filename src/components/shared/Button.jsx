export function Button({ children, onClick, variant = 'default', disabled, className = '' }) {
  const base = 'px-4 py-2 rounded font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    default: 'bg-[var(--panel-border)] text-[var(--text-primary)] hover:bg-[#3a3a4a]',
    primary: 'bg-[var(--accent-yellow)] text-black hover:brightness-110',
    danger:  'bg-[var(--accent-red)] text-white hover:brightness-110',
    ghost:   'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] ?? variants.default} ${className}`}
    >
      {children}
    </button>
  )
}
