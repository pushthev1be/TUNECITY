import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// flash_side: white exhaust cone shooting RIGHT from left-edge origin, black bg
// We rotate -90deg → shoots UPWARD (backward from car rear in front-facing view)
// mix-blend-mode:screen makes black transparent; CSS filter tints white → orange
const SIDE_RAW = import.meta.glob(
  '/src/assets/sprites/effects/exhaust/flash_side_*.png',
  { eager: true }
)
const SIDE_FRAMES = Object.keys(SIDE_RAW)
  .sort((a, b) => {
    const n = s => parseInt(s.match(/(\d+)\.png$/)?.[1] ?? '0')
    return n(a) - n(b)
  })
  .map(k => SIDE_RAW[k].default)

// flash_long: long horizontal streak, also rotated -90deg for sustained exhaust trail
const LONG_RAW = import.meta.glob(
  '/src/assets/sprites/effects/exhaust/flash_long_*.png',
  { eager: true }
)
const LONG_FRAMES = Object.keys(LONG_RAW)
  .sort((a, b) => {
    const n = s => parseInt(s.match(/(\d+)\.png$/)?.[1] ?? '0')
    return n(a) - n(b)
  })
  .map(k => LONG_RAW[k].default)

// Shared orange-tint filter for all exhaust effects (grayscale → hot orange)
const ORANGE_FILTER = 'sepia(1) saturate(6) hue-rotate(-10deg) brightness(1.4)'

// Cycling flash_side frames = animated exhaust cone
function ExhaustCone({ size, flip = false }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!SIDE_FRAMES.length) return
    const id = setInterval(() => setFrame(f => (f + 1) % SIDE_FRAMES.length), 70)
    return () => clearInterval(id)
  }, [])

  if (!SIDE_FRAMES.length) return null

  return (
    <img
      src={SIDE_FRAMES[frame]}
      alt=""
      style={{
        width:          size,
        height:         size,
        objectFit:      'cover',
        // origin of flash_side is left-center; rotate so it shoots upward
        // flip mirrors for right-side exhaust (shoots up-left instead of up-right)
        transform:      `rotate(-90deg) ${flip ? 'scaleX(-1)' : ''}`,
        filter:         ORANGE_FILTER,
        mixBlendMode:   'screen',
        display:        'block',
        pointerEvents:  'none',
      }}
    />
  )
}

// Per-car exhaust plume configs
// x/y = % in the 1:1 inner garage container, anchor = bottom-center of plume
// size = px width of the effect image (controls how far flame reaches)
// flip = mirror the cone (for right-side exhaust tip)
const EXHAUST_CONFIGS = {
  civic_eg_92_project: [{ x: 50,  y: 46, size: 55 }],
  charger_69_rt:       [{ x: 42,  y: 44, size: 68 }, { x: 58, y: 44, size: 68, flip: true }],
  bmw_m4_comp:         [{ x: 43,  y: 45, size: 60 }, { x: 57, y: 45, size: 60, flip: true }],
  lamborghini_urus:    [{ x: 40,  y: 43, size: 72 }, { x: 60, y: 43, size: 72, flip: true }],
  corvette_c5:         [{ x: 42,  y: 44, size: 65 }, { x: 58, y: 44, size: 65, flip: true }],
  toyota_camry:        [{ x: 50,  y: 46, size: 50 }],
  dodge_hellcat:       [{ x: 41,  y: 43, size: 75 }, { x: 59, y: 43, size: 75, flip: true }],
  ram_truck:           [{ x: 40,  y: 42, size: 78 }, { x: 60, y: 42, size: 78, flip: true }],
  subaru_wrx:          [{ x: 50,  y: 44, size: 60 }],
  mystery_0e:          [{ x: 41,  y: 43, size: 70 }, { x: 59, y: 43, size: 70, flip: true }],
  mystery_88:          [{ x: 43,  y: 45, size: 60 }, { x: 57, y: 45, size: 60, flip: true }],
  mystery_ae:          [{ x: 43,  y: 44, size: 65 }, { x: 57, y: 44, size: 65, flip: true }],
}
const DEFAULT_CONFIG = [{ x: 44, y: 44, size: 62 }, { x: 56, y: 44, size: 62, flip: true }]

export function ExhaustFlames({ active, carId }) {
  const config = EXHAUST_CONFIGS[carId] ?? DEFAULT_CONFIG

  return (
    <AnimatePresence>
      {active && config.map((plume, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          style={{
            position:       'absolute',
            left:           `${plume.x}%`,
            top:            `${plume.y}%`,
            // anchor: bottom-center of this div = exhaust tip
            transform:      'translate(-50%, -100%)',
            zIndex:         6,
            pointerEvents:  'none',
            // isolate stacking context so mix-blend-mode works against the garage bg
            isolation:      'auto',
          }}
        >
          <ExhaustCone size={plume.size} flip={plume.flip} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
