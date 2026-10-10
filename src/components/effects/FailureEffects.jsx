import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const FIRE_RAW = import.meta.glob('/src/assets/sprites/effects/fire/fire_column_medium_*.png', { eager: true })
const FIRE_FRAMES = Object.keys(FIRE_RAW)
  .sort((a, b) => parseInt(a.match(/(\d+)\.png$/)[1]) - parseInt(b.match(/(\d+)\.png$/)[1]))
  .map(k => FIRE_RAW[k].default)

// One looping fire column; x/y = stage % of its bottom-center, width = stage %
function FireColumn({ x, y, width, delay = 0 }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    let id
    const start = setTimeout(() => {
      id = setInterval(() => setFrame(f => (f + 1) % FIRE_FRAMES.length), 70)
    }, delay)
    return () => { clearTimeout(start); clearInterval(id) }
  }, [delay])

  return (
    <img
      src={FIRE_FRAMES[frame]}
      alt=""
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`, top: `${y}%`, width: `${width}%`,
        transform: 'translate(-50%, -88%)',
        imageRendering: 'pixelated',
        zIndex: 12,
      }}
    />
  )
}

// Dark smoke puffs drifting up from the engine bay
function Smoke({ x, y }) {
  return Array.from({ length: 7 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x + (i % 3 - 1) * 2.5}%`, top: `${y}%`,
        width: '6%', aspectRatio: '1',
        background: 'radial-gradient(circle, rgba(40,40,44,0.85) 0%, rgba(40,40,44,0) 70%)',
        zIndex: 11,
      }}
      initial={{ opacity: 0, scale: 0.4, x: '-50%', y: '-50%' }}
      animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.6, 2.6], y: ['-50%', '-260%', '-480%'] }}
      transition={{ duration: 2.4, delay: i * 0.28, repeat: Infinity, ease: 'easeOut' }}
    />
  ))
}

// Shown over the car after a catastrophic ignition. Coordinates are stage %.
export function FailureEffects({ fire }) {
  return (
    <>
      <Smoke x={50} y={56} />
      {fire && (
        <>
          <FireColumn x={45} y={60} width={7} />
          <FireColumn x={54} y={59} width={8} delay={150} />
        </>
      )}
    </>
  )
}
