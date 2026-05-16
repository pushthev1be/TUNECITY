import { useGameStore } from '../../stores/useGameStore.js'
import { play } from '../../utils/sfx.js'
import { Card } from '../shared/Card.jsx'
import { Button } from '../shared/Button.jsx'
import { RotatingSprite } from '../shared/RotatingSprite.jsx'
import { ROTATION_KEYS } from '../../assets/spriteMap.js'

const TIER_LABELS = ['', 'Stock', 'Street', 'Race', 'Exotic']
const TIER_COLORS = ['', 'text-gray-400', 'text-[var(--tag-character)]', 'text-[var(--accent-yellow)]', 'text-[var(--accent-red)]']

export function ShopItemCard({ part }) {
  const currency    = useGameStore(s => s.currency)
  const ownedParts  = useGameStore(s => s.ownedParts)
  const buyPart     = useGameStore(s => s.buyPart)
  const installPart = useGameStore(s => s.installPart)

  const owned      = ownedParts[part.id] ?? 0
  const canBuy     = currency >= part.cost && part.cost > 0
  const spriteKey  = ROTATION_KEYS[part.id] ?? ROTATION_KEYS[part.category] ?? null

  return (
    <Card className="p-3 flex gap-3 items-start">
      {/* Rotating sprite preview */}
      <div className="shrink-0 w-16 h-16 flex items-center justify-center bg-[var(--garage-bg)] rounded">
        {spriteKey
          ? <RotatingSprite spriteKey={spriteKey} size={56} fps={6} />
          : <div className="w-10 h-10 rounded bg-[var(--panel-border)] opacity-40" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[var(--text-primary)] text-sm font-bold leading-tight">{part.name}</p>
            <p className={`text-xs ${TIER_COLORS[part.tier] ?? ''}`}>
              {TIER_LABELS[part.tier]} · {part.category.replace(/_/g, ' ')}
            </p>
          </div>
          {owned > 0 && (
            <span className="text-[var(--tag-positive)] text-xs shrink-0">×{owned}</span>
          )}
        </div>

        <p className="text-[var(--text-muted)] text-xs leading-tight">{part.description}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[var(--accent-yellow)] font-bold text-sm">
            {part.cost === 0 ? 'Free' : `$${part.cost.toLocaleString()}`}
          </span>
          <div className="flex gap-2">
            {owned > 0 && (
              <Button
                variant="primary"
                onClick={() => { play('select'); installPart(part.category, part.id) }}
                className="text-xs py-1 px-3 bg-[var(--tag-positive)] text-black border-none hover:opacity-90"
              >
                Install
              </Button>
            )}
            {part.cost > 0 && (
              <Button
                variant={canBuy ? (owned > 0 ? 'default' : 'primary') : 'default'}
                disabled={!canBuy}
                onClick={() => { play('buy'); buyPart(part.id) }}
                className="text-xs py-1 px-3"
              >
                Buy
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
