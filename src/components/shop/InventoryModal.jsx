import { useGameStore } from '../../stores/useGameStore.js'
import { PART_SPRITES } from '../../assets/spriteMap.js'
import partsData from '../../data/parts.json'
import blackMarketData from '../../data/blackMarket.json'

const ALL_PARTS = [...partsData, ...blackMarketData]
const TIER_LABELS = ['', 'Stock', 'Street', 'Perf', 'Legend']
const TIER_COLORS = ['', 'text-gray-400', 'text-[var(--tag-character)]', 'text-[var(--accent-yellow)]', 'text-[var(--accent-red)]']

export function InventoryModal({ onClose }) {
  const ownedParts = useGameStore(s => s.ownedParts)
  const sellPart   = useGameStore(s => s.sellPart)
  const scrapPart  = useGameStore(s => s.scrapPart)

  const items = ALL_PARTS.filter(p => (ownedParts[p.id] ?? 0) > 0)
  const totalCount = items.reduce((sum, p) => sum + ownedParts[p.id], 0)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl w-full max-w-lg h-[70vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--panel-border)]">
          <div>
            <h2 className="text-[var(--text-primary)] font-bold text-base">Inventory</h2>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">{totalCount} part{totalCount !== 1 ? 's' : ''} in stock</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none">✕</button>
        </div>

        {/* Legend */}
        <div className="shrink-0 flex items-center justify-between px-5 py-2 border-b border-[var(--panel-border)]/50 text-xs text-[var(--text-muted)]">
          <span>Part</span>
          <div className="flex gap-6 pr-1">
            <span>Sell (75%)</span>
            <span>Scrap</span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] text-sm py-16">No parts in inventory</p>
          ) : (
            items.map(part => {
              const qty       = ownedParts[part.id]
              const salePrice = Math.floor(part.cost * 0.75)
              const scrapVal  = part.scrap_value ?? Math.floor(part.cost * 0.18)
              const sprite    = PART_SPRITES[part.category] ?? null
              const tierColor = TIER_COLORS[part.tier] ?? ''

              return (
                <div
                  key={part.id}
                  className="flex items-center gap-3 px-5 py-2.5 border-b border-[var(--panel-border)]/40 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  {sprite && (
                    <img src={sprite} alt="" className="w-8 h-8 object-contain shrink-0 pixelated opacity-90" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-primary)] text-xs font-semibold truncate">{part.name}</span>
                      <span className={`text-xs shrink-0 ${tierColor}`}>{TIER_LABELS[part.tier]}</span>
                    </div>
                    <span className="text-[var(--text-muted)] text-xs">×{qty}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => sellPart(part.id)}
                      className="text-xs px-2.5 py-1 rounded bg-[var(--tag-positive)]/20 text-[var(--tag-positive)] hover:bg-[var(--tag-positive)]/35 transition-colors font-mono"
                    >
                      ${salePrice.toLocaleString()}
                    </button>
                    <button
                      onClick={() => scrapPart(part.id)}
                      title={`Scrap for $${scrapVal.toLocaleString()}`}
                      className="text-xs px-2 py-1 rounded bg-[var(--text-muted)]/15 text-[var(--text-muted)] hover:bg-[var(--text-muted)]/30 transition-colors"
                    >
                      ♻ ${scrapVal.toLocaleString()}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
