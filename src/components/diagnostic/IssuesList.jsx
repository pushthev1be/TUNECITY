import { useState } from 'react'

const SEVERITY_STYLE = {
  critical: { dot: '🔴', badge: 'bg-red-900/50 text-red-400 border border-red-700/40' },
  severe:   { dot: '🟠', badge: 'bg-orange-900/50 text-orange-400 border border-orange-700/40' },
  moderate: { dot: '🟡', badge: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/40' },
  low:      { dot: '⚪', badge: 'bg-gray-800/50 text-gray-400 border border-gray-600/40' },
}

function IssueItem({ issue }) {
  const [open, setOpen] = useState(false)
  const style = SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.low
  const hasSubs = issue.sub_causes?.length > 0 || issue.consequences?.length > 0

  return (
    <li className="text-xs rounded bg-[var(--panel-bg)] border border-[var(--panel-border)]">
      <button
        onClick={() => hasSubs && setOpen(o => !o)}
        className={`w-full flex items-start gap-2 px-2 py-1.5 text-left ${hasSubs ? 'hover:bg-[var(--panel-border)] transition-colors' : ''}`}
      >
        <span className="mt-0.5 shrink-0">{style.dot}</span>
        <span className="flex-1 min-w-0">
          <span className="font-bold text-[var(--text-primary)]">{issue.label}</span>
          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${style.badge}`}>
            {issue.severity}
          </span>
          <p className="text-[var(--text-muted)] mt-0.5 leading-snug">{issue.text}</p>
        </span>
        {hasSubs && (
          <span className="text-[var(--text-muted)] shrink-0 mt-0.5">
            {open ? '▲' : '▼'}
          </span>
        )}
      </button>

      {open && hasSubs && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-[var(--panel-border)] pt-1.5">
          {issue.sub_causes?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-[var(--text-muted)] font-semibold mb-0.5">Causes</p>
              <ul className="space-y-0.5">
                {issue.sub_causes.map((c, i) => (
                  <li key={i} className="text-[var(--text-muted)] flex gap-1.5">
                    <span className="shrink-0 text-[var(--accent-yellow)]">›</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {issue.consequences?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-[var(--text-muted)] font-semibold mb-0.5">Consequences</p>
              <ul className="space-y-0.5">
                {issue.consequences.map((c, i) => (
                  <li key={i} className="text-[var(--accent-red)]/80 flex gap-1.5">
                    <span className="shrink-0">→</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export function IssuesList({ issues }) {
  if (!issues?.length) {
    return (
      <p className="text-[var(--tag-positive)] text-xs italic">No issues detected</p>
    )
  }

  return (
    <ul className="space-y-1">
      {issues.map(issue => (
        <IssueItem key={issue.tag} issue={issue} />
      ))}
    </ul>
  )
}
