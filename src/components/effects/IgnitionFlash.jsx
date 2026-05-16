import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const RAW = import.meta.glob(
  '/src/assets/sprites/effects/flash/*.png',
  { eager: true }
)
const FRAMES = Object.keys(RAW)
  .sort((a, b) => {
    const n = s => parseInt(s.match(/(\d+)\.png$/)?.[1] ?? '0')
    return n(a) - n(b)
  })
  .map(k => RAW[k].default)

// Plays the flash animation once then calls onDone
export function IgnitionFlash({ active, onDone }) {
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!active) { setFrame(0); setPlaying(false); return }
    setFrame(0)
    setPlaying(true)
  }, [active])

  useEffect(() => {
    if (!playing) return
    if (frame >= FRAMES.length - 1) {
      const t = setTimeout(() => { setPlaying(false); onDone?.() }, 80)
      return () => clearTimeout(t)
    }
    const id = setTimeout(() => setFrame(f => f + 1), 55)
    return () => clearTimeout(id)
  }, [playing, frame, onDone])

  if (!FRAMES.length) return null

  return (
    <AnimatePresence>
      {playing && (
        <motion.img
          key="flash"
          src={FRAMES[frame]}
          alt=""
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0.9 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position:       'absolute',
            inset:          0,
            width:          '100%',
            height:         '100%',
            objectFit:      'cover',
            mixBlendMode:   'screen',   // black = transparent, white = additive light
            zIndex:         10,
            pointerEvents:  'none',
          }}
        />
      )}
    </AnimatePresence>
  )
}
