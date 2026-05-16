import { useState } from 'react'
import blackMarketData from '../../data/blackMarket.json'
import partsData from '../../data/parts.json'
import { useGameStore } from '../../stores/useGameStore.js'
import { PART_SPRITES, underground_sign, dollar_stack } from '../../assets/spriteMap.js'
import { Button } from '../shared/Button.jsx'

const TIER_COLORS = ['', 'text-gray-400', 'text-[var(--tag-character)]', 'text-[var(--accent-yellow)]', 'text-[var(--accent-red)]']
const TIER_LABELS = ['', 'Stock', 'Street', 'Performance', 'Legend']

function BMPartCard({ part, canAfford, owned, onBuy }) {
  const sprite = PART_SPRITES[part.category] ?? null
  const tierColor = TIER_COLORS[part.tier] ?? ''

  return (
    <div className={`flex gap-3 p-3 rounded-lg border transition-colors ${
      canAfford
        ? 'border-[var(--accent-red)]/60 bg-[var(--accent-red)]/5 hover:bg-[var(--accent-red)]/10'
        : 'border-[var(--panel-border)] bg-[var(--panel-bg)]/40 opacity-60'
    }`}>
      {sprite && (
        <img src={sprite} alt={part.name} className="w-12 h-12 object-contain shrink-0 pixelated" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <span className="text-[var(--text-primary)] text-sm font-bold leading-tight">{part.name}</span>
          <span className={`text-xs font-bold ${tierColor}`}>{TIER_LABELS[part.tier]}</span>
        </div>
        <p className="text-[var(--text-muted)] text-xs mt-0.5 leading-snug line-clamp-2">{part.description}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {Object.entries(part.stats ?? {}).slice(0, 4).map(([k, v]) => (
            <span key={k} className="text-xs text-[var(--text-muted)]">
              <span className="text-[var(--accent-yellow)] opacity-70">{k.replace(/_/g, ' ')}</span>
              {' '}
              <span className="font-mono text-[var(--text-primary)]">{typeof v === 'number' ? v.toLocaleString() : String(v)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2">
        <span className="text-[var(--accent-yellow)] font-mono text-sm font-bold">${part.cost.toLocaleString()}</span>
        {owned > 0 && (
          <span className="text-[var(--tag-positive)] text-xs">Owned: {owned}</span>
        )}
        <Button
          variant="danger"
          className="text-xs px-3 py-1"
          disabled={!canAfford}
          onClick={onBuy}
        >
          {canAfford ? 'Acquire' : 'Need $' + (part.cost).toLocaleString()}
        </Button>
      </div>
    </div>
  )
}

function SellRow({ part, qty, onSell, onScrap }) {
  const salePrice  = Math.floor(part.cost * 0.75)
  const scrapValue = part.scrap_value ?? Math.floor(part.cost * 0.18)
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[var(--panel-border)]/50 last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-[var(--text-primary)] text-xs font-semibold">{part.name}</span>
        <span className="text-[var(--text-muted)] text-xs ml-2">×{qty}</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onSell}
          className="text-xs px-2 py-1 rounded bg-[var(--tag-positive)]/20 text-[var(--tag-positive)] hover:bg-[var(--tag-positive)]/30 transition-colors"
        >
          Sell ${salePrice.toLocaleString()}
        </button>
        <button
          onClick={onScrap}
          className="text-xs px-2 py-1 rounded bg-[var(--text-muted)]/20 text-[var(--text-muted)] hover:bg-[var(--text-muted)]/30 transition-colors"
        >
          Scrap ${scrapValue.toLocaleString()}
        </button>
      </div>
    </div>
  )
}

export function BlackMarketShop({ onClose }) {
  const [tab, setTab] = useState('buy')

  const currency    = useGameStore(s => s.currency)
  const bmStock     = useGameStore(s => s.bmStock)
  const bmUnlocked  = useGameStore(s => s.bmUnlocked)
  const ownedParts  = useGameStore(s => s.ownedParts)
  const buyBMPart   = useGameStore(s => s.buyBMPart)
  const sellPart    = useGameStore(s => s.sellPart)
  const scrapPart   = useGameStore(s => s.scrapPart)
  const refreshBM   = useGameStore(s => s.refreshBMStock)

  // Sellable inventory: all parts with qty > 0
  const allSellable = partsData
    .concat(blackMarketData)
    .filter(p => (ownedParts[p.id] ?? 0) > 0)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--panel-bg)] border border-[var(--accent-red)]/50 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--accent-red)]/30">
          <div className="flex items-center gap-3">
            <img src={underground_sign} alt="" className="w-12 h-12 object-contain pixelated shrink-0" />
            <div>
              <h2 className="text-[var(--accent-red)] font-bold text-lg tracking-widest uppercase">Black Market</h2>
              <p className="text-[var(--text-muted)] text-xs mt-0.5">Tier-4 parts. No warranty. No questions.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img src={dollar_stack} alt="" className="w-8 h-8 object-contain pixelated" />
            <span className="text-[var(--accent-yellow)] font-mono text-sm">${currency.toLocaleString()}</span>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-[var(--panel-border)]">
          {['buy', 'sell'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs uppercase tracking-wider font-bold transition-colors ${
                tab === t
                  ? 'text-[var(--accent-red)] border-b-2 border-[var(--accent-red)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === 'buy' ? 'Acquire Parts' : 'Sell / Scrap'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'buy' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[var(--text-muted)] text-xs">Today's supply — {bmStock.length} item{bmStock.length !== 1 ? 's' : ''} available</p>
                <button
                  onClick={refreshBM}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-yellow)] transition-colors"
                >
                  Refresh stock ↻
                </button>
              </div>
              {bmStock.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-12 text-sm">Stock sold out. Come back tomorrow.</p>
              ) : (
                bmStock.map(part => (
                  <BMPartCard
                    key={part.id}
                    part={part}
                    canAfford={currency >= part.cost}
                    owned={ownedParts[part.id] ?? 0}
                    onBuy={() => buyBMPart(part.id)}
                  />
                ))
              )}
            </div>
          )}

          {tab === 'sell' && (
            <div>
              <p className="text-[var(--text-muted)] text-xs mb-3">
                Sell at 75% value · Scrap at base scrap rate
              </p>
              {allSellable.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-12 text-sm">Inventory empty.</p>
              ) : (
                allSellable.map(part => (
                  <SellRow
                    key={part.id}
                    part={part}
                    qty={ownedParts[part.id]}
                    onSell={() => sellPart(part.id)}
                    onScrap={() => scrapPart(part.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
