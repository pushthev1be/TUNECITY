export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-lg ${onClick ? 'cursor-pointer hover:border-[var(--accent-yellow)] transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
