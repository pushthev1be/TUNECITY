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
function ExhaustCone({ flip = false }) {
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
        width:          '100%',
        aspectRatio:    '1',
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
// x/y/size = % of the 256×256 garage stage (same grid as the car sprites);
// anchor = bottom-center of plume, size controls how far the flame reaches
// flip = mirror the cone (for right-side exhaust tip)
const EXHAUST_CONFIGS = {
  civic_eg_92_project: [{ x: 50, y: 32.1, size: 6.9 }],
  charger_69_rt:       [{ x: 40.4, y: 35, size: 8.5 }, { x: 59.6, y: 35, size: 8.5, flip: true }],
  bmw_m4_comp:         [{ x: 41.6, y: 33.6, size: 7.5 }, { x: 58.4, y: 33.6, size: 7.5, flip: true }],
  lamborghini_urus:    [{ x: 38, y: 33.4, size: 9 }, { x: 62, y: 33.4, size: 9, flip: true }],
  corvette_c5:         [{ x: 40.4, y: 33.8, size: 8.1 }, { x: 59.6, y: 33.8, size: 8.1, flip: true }],
  toyota_camry:        [{ x: 50, y: 37.3, size: 6.2 }],
  dodge_hellcat:       [{ x: 39.2, y: 32.9, size: 9.4 }, { x: 60.8, y: 32.9, size: 9.4, flip: true }],
  ram_truck:           [{ x: 38, y: 34.9, size: 9.8 }, { x: 62, y: 34.9, size: 9.8, flip: true }],
  subaru_wrx:          [{ x: 50, y: 32.3, size: 7.5 }],
  mystery_0e:          [{ x: 39.2, y: 33.5, size: 8.8 }, { x: 60.8, y: 33.5, size: 8.8, flip: true }],
  mystery_88:          [{ x: 41.6, y: 37.9, size: 7.5 }, { x: 58.4, y: 37.9, size: 7.5, flip: true }],
  mystery_ae:          [{ x: 41.6, y: 37.1, size: 8.1 }, { x: 58.4, y: 37.1, size: 8.1, flip: true }],
}
const DEFAULT_CONFIG = [{ x: 42.8, y: 33, size: 7.8 }, { x: 57.2, y: 33, size: 7.8, flip: true }]

// scale/origin: the car layer is drawn scaled about origin (in stage %), so plumes
// defined in sprite coordinates are mapped the same way to stay on the car
export function ExhaustFlames({ active, carId, scale = 1, origin = { x: 50, y: 50 } }) {
  const config = (EXHAUST_CONFIGS[carId] ?? DEFAULT_CONFIG).map(p => ({
    ...p,
    x:    origin.x + (p.x - origin.x) * scale,
    y:    origin.y + (p.y - origin.y) * scale,
    size: p.size * scale,
  }))

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
            width:          `${plume.size}%`,
            transform:      'translate(-50%, -100%)',
            zIndex:         6,
            pointerEvents:  'none',
            // z-index makes this div its own stacking context, so the blend has to
            // live here (not on the img) to reach the garage behind it
            mixBlendMode:   'screen',
          }}
        >
          <ExhaustCone flip={plume.flip} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
