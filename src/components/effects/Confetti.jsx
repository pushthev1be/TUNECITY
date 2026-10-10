import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#f5c842', '#38b86e', '#d94040', '#6b7fe0', '#e8e8ec', '#e07820']

// Square pixel confetti bursting up from the bottom, then falling past the screen
export function Confetti({ count = 60 }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    size: 6 + Math.floor(Math.random() * 3) * 3,
    color: COLORS[i % COLORS.length],
    peak: 35 + Math.random() * 45,
    drift: (Math.random() - 0.5) * 30,
    spin: (Math.random() - 0.5) * 720,
    delay: Math.random() * 0.25,
    duration: 2.2 + Math.random() * 1.2,
  })), [count])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]" aria-hidden="true">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.left}%`, bottom: 0, width: p.size, height: p.size, background: p.color }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: ['0vh', `-${p.peak}vh`, '15vh'],
            x: [0, p.drift * 0.6, p.drift],
            rotate: p.spin,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: ['easeOut', 'easeIn'], times: [0, 0.4, 1] }}
        />
      ))}
    </div>
  )
}
