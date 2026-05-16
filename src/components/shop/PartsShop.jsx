import { useState } from 'react'
import partsData from '../../data/parts.json'
import { ShopItemCard } from './ShopItemCard.jsx'
import { useGameStore } from '../../stores/useGameStore.js'

const CATEGORIES = [
  'All', 'engine', 'intake', 'forced_induction', 'exhaust',
  'transmission', 'differential', 'tires', 'wheels',
  'suspension', 'ecu', 'cooling',
  'battery', 'ignition_coil', 'spark_plugs', 'head_gasket', 'fuel_pump',
]

// Filter out free parts with cost 0 from the shop (they come from starting inventory)
const SHOP_PARTS = partsData.filter(p => p.cost > 0)

export function PartsShop({ onClose, filterSlot }) {
  const currency  = useGameStore(s => s.currency)
  const [category, setCategory] = useState(filterSlot ?? 'All')
  const [search, setSearch] = useState('')

  const filtered = SHOP_PARTS.filter(p => {
    const catMatch = category === 'All' || p.category === category
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  }).sort((a, b) => a.tier - b.tier || a.cost - b.cost)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--panel-border)]">
          <h2 className="text-[var(--accent-yellow)] font-bold uppercase tracking-widest">Parts Shop</h2>
          <div className="flex items-center gap-4">
            <span className="text-[var(--tag-positive)] font-bold">${currency.toLocaleString()}</span>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <input
            type="text"
            placeholder="Search parts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--garage-bg)] border border-[var(--panel-border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-yellow)]"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 px-4 py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 text-xs px-2 py-1 rounded capitalize transition-colors
                ${category === cat
                  ? 'bg-[var(--accent-yellow)] text-black font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Parts grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
          {filtered.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm col-span-2 text-center pt-8">No parts found</p>
          )}
          {filtered.map(part => (
            <ShopItemCard key={part.id} part={part} />
          ))}
        </div>
      </div>
    </div>
  )
}
