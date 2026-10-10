import { useEffect, useRef, useState } from 'react'
import { animate, AnimatePresence, motion } from 'framer-motion'

// 12×12 pixel-art coin, built once: gold disc, dark rim, upper-left shine, embossed $
const COIN_PIXELS = (() => {
  const DOLLAR = [
    '..#...',
    '.####.',
    '#.#...',
    '.###..',
    '..#.#.',
    '####..',
    '..#...',
  ]
  const px = []
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const d = Math.hypot(x - 5.5, y - 5.5)
      if (d > 6) continue
      let fill = d > 4.9 ? '#8a5a00' : '#f5c842'
      if (fill !== '#8a5a00' && x + y < 8 && d > 3.2) fill = '#fff1a8'
      if (fill !== '#8a5a00' && x + y > 15 && d > 3.2) fill = '#c9961a'
      const gy = y - 2, gx = x - 3
      if (DOLLAR[gy]?.[gx] === '#') fill = '#8a5a00'
      px.push({ x, y, fill })
    }
  }
  return px
})()

export function CoinIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={`shrink-0 inline-block ${className}`}
      aria-hidden="true"
    >
      {COIN_PIXELS.map(p => <rect key={`${p.x},${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.fill} />)}
    </svg>
  )
}

function format(n) {
  return `$${Math.round(n).toLocaleString()}`
}

// Static price tag: coin + amount
export function Price({ amount, iconSize = 14, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${className}`}>
      <CoinIcon size={iconSize} />
      {format(amount)}
    </span>
  )
}

// Live balance: counts toward the new value and floats the change above it
export function Money({ amount, iconSize = 16, className = '' }) {
  const [shown, setShown] = useState(amount)
  const [deltas, setDeltas] = useState([])
  const prev = useRef(amount)
  const shownRef = useRef(amount)

  useEffect(() => {
    const delta = amount - prev.current
    prev.current = amount
    if (delta === 0) return

    const id = `${Date.now()}-${Math.random()}`
    setDeltas(ds => [...ds, { id, delta }])
    // Not cleared on re-run: rapid changes each keep their own float
    setTimeout(() => setDeltas(ds => ds.filter(d => d.id !== id)), 1200)

    const controls = animate(shownRef.current, amount, {
      duration: Math.min(1.2, 0.35 + Math.abs(delta) / 60000),
      ease: 'easeOut',
      onUpdate: v => { shownRef.current = v; setShown(v) },
    })
    return () => controls.stop()
  }, [amount])

  return (
    <span className={`relative inline-flex items-center gap-1 font-mono font-bold tabular-nums ${className}`}>
      <CoinIcon size={iconSize} />
      {format(shown)}
      <AnimatePresence>
        {deltas.map(d => (
          <motion.span
            key={d.id}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -18 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`absolute right-0 -top-1 text-xs font-bold pointer-events-none whitespace-nowrap ${
              d.delta > 0 ? 'text-[var(--tag-positive)]' : 'text-[var(--accent-red)]'
            }`}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          >
            {d.delta > 0 ? '+' : '−'}{format(Math.abs(d.delta))}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
}
