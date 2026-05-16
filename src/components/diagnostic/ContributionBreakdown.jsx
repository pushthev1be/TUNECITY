import { useGameStore } from '../../stores/useGameStore.js'

const HP_SLOTS  = ['engine', 'forced_induction', 'nitrous']
const REL_SLOTS = ['cooling', 'brakes', 'engine_internals', 'head_gasket']

// Returns each installed part's contribution row
function buildContributions(installedParts, stats) {
  const rows = []

  for (const [slot, part] of Object.entries(installedParts)) {
    if (!part) continue

    const hp_bonus      = part.stats?.hp_bonus ?? 0
    const hp_multiplier = part.stats?.hp_multiplier ?? null
    const rel_bonus     = part.stats?.reliability_bonus ?? 0
    const cooling_bonus = part.stats?.cooling_bonus ?? 0

    // Only include parts that meaningfully affect HP or reliability
    if (hp_bonus === 0 && !hp_multiplier && rel_bonus === 0 && cooling_bonus === 0) continue

    rows.push({ slot, name: part.name, tier: part.tier, hp_bonus, hp_multiplier, rel_bonus, cooling_bonus })
  }

  return rows
}

function TierDot({ tier }) {
  const colors = ['', 'bg-gray-500', 'bg-[var(--tag-character)]', 'bg-[var(--accent-yellow)]', 'bg-[var(--accent-red)]']
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${colors[tier] ?? 'bg-gray-600'}`} />
  )
}

export function ContributionBreakdown() {
  const installedParts = useGameStore(s => s.installedParts)
  const stats          = useGameStore(s => s.computed?.stats ?? {})

  const rows = buildContributions(installedParts, stats)

  if (rows.length === 0) {
    return <p className="text-[var(--text-muted)] text-xs italic">No contributing parts installed</p>
  }

  const totalHp  = stats.hp ?? 0
  const totalRel = stats.reliability ?? 0

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] uppercase text-[var(--text-muted)] font-semibold px-1">
        <span>Part</span>
        <span className="text-right w-10">HP</span>
        <span className="text-right w-10">Rel</span>
        <span className="text-right w-12">Cool</span>
      </div>

      {rows.map(row => (
        <div
          key={row.slot}
          className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1 py-0.5 rounded hover:bg-[var(--panel-border)] text-xs"
        >
          <span className="truncate text-[var(--text-primary)]">
            <TierDot tier={row.tier} />
            {row.name}
          </span>
          <span className="text-right w-10 text-[var(--accent-yellow)] tabular-nums">
            {row.hp_bonus > 0
              ? `+${row.hp_bonus}`
              : row.hp_multiplier
              ? `×${row.hp_multiplier.toFixed(2)}`
              : '—'}
          </span>
          <span className={`text-right w-10 tabular-nums ${row.rel_bonus > 0 ? 'text-[var(--tag-positive)]' : 'text-[var(--text-muted)]'}`}>
            {row.rel_bonus > 0 ? `+${row.rel_bonus}` : '—'}
          </span>
          <span className={`text-right w-12 tabular-nums ${row.cooling_bonus > 0 ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}>
            {row.cooling_bonus > 0 ? `+${row.cooling_bonus}` : '—'}
          </span>
        </div>
      ))}

      {/* Totals */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1 pt-1 border-t border-[var(--panel-border)] text-xs font-bold">
        <span className="text-[var(--text-muted)] uppercase text-[10px]">Total</span>
        <span className="text-right w-10 text-[var(--accent-yellow)] tabular-nums">{Math.round(totalHp)}</span>
        <span className="text-right w-10 text-[var(--tag-positive)] tabular-nums">{Math.round(totalRel)}%</span>
        <span className="text-right w-12 text-[var(--text-muted)]">—</span>
      </div>
    </div>
  )
}
