import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/useGameStore.js'
import spinner03 from '../../assets/ui/spinner03.png'

// 6-phase startup sequence. Each phase shows at the given delay (ms).
// Labels adapt based on the predicted outcome state.
function buildPhases(predictionState) {
  const failing = predictionState === 'dead' || predictionState === 'catastrophic'
  const risky   = predictionState === 'detonation_risk' || predictionState === 'unstable'

  return [
    { delay: 0,    label: 'Phase 1 — Electrical check...' },
    { delay: 500,  label: 'Phase 2 — Engaging starter motor...' },
    { delay: 1000, label: failing
        ? 'Phase 3 — Crank attempt... no response'
        : 'Phase 3 — Cranking...' },
    { delay: 1600, label: failing
        ? 'Phase 4 — Ignition attempt... no fire'
        : risky
        ? 'Phase 4 — Ignition attempt... unstable spark'
        : 'Phase 4 — Firing ignition...' },
    { delay: 2200, label: failing
        ? 'Phase 5 — Combustion failed'
        : risky
        ? 'Phase 5 — Combustion unstable...'
        : 'Phase 5 — Stabilizing combustion...' },
    { delay: 2800, label: failing
        ? 'Phase 6 — Engine unable to hold idle'
        : risky
        ? 'Phase 6 — Idle rough — check build'
        : 'Phase 6 — Settling to idle...' },
  ]
}

export function IgnitionSequence() {
  const ignitionState = useGameStore(s => s.ignitionState)
  const prediction    = useGameStore(s => s.computed?.prediction)
  const smokeColor    = useGameStore(s => s.computed?.smokeColor)

  const [visiblePhases, setVisiblePhases] = useState([])

  useEffect(() => {
    if (ignitionState !== 'animating') {
      setVisiblePhases([])
      return
    }

    const phases = buildPhases(prediction?.state ?? 'stable')
    const timers = phases.map((phase, i) =>
      setTimeout(() => setVisiblePhases(prev => [...prev, i]), phase.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [ignitionState, prediction?.state])

  if (ignitionState !== 'animating') return null

  const smokeStyle = smokeColor
    ? { white: 'text-gray-200', blue: 'text-blue-400', black: 'text-gray-900', grey: 'text-gray-500' }[smokeColor]
    : 'text-[var(--accent-yellow)]'

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-5 px-6 max-w-xs w-full"
      >
        {/* Spinner — spinner03.png: top-left frame (x=0, y=0, 60×36px), rendered at 3x */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 180, height: 108,
            backgroundImage: `url(${spinner03})`,
            backgroundPosition: '0 0',
            backgroundSize: '720px 432px',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            margin: '0 auto',
            filter: smokeStyle.includes('gray-200') ? 'brightness(1.4)'
              : smokeStyle.includes('blue') ? 'hue-rotate(60deg)'
              : smokeStyle.includes('gray-9') ? 'brightness(0.4)'
              : 'none',
          }}
        />

        {/* Prediction badge */}
        {prediction && (
          <div
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mx-auto w-fit"
            style={{ backgroundColor: prediction.color + '22', color: prediction.color, border: `1px solid ${prediction.color}55` }}
          >
            {prediction.label} — {Math.round((prediction.confidence ?? 0) * 100)}%
          </div>
        )}

        {/* Phase log */}
        <div className="space-y-1 text-left">
          {buildPhases(prediction?.state ?? 'stable').map(({ label }, i) => (
            <AnimatePresence key={i}>
              {visiblePhases.includes(i) && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`text-xs tracking-wide ${
                    i === visiblePhases[visiblePhases.length - 1]
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {label}
                </motion.p>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* Pulse ring */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="mx-auto w-4 h-4 rounded-full"
          style={{ backgroundColor: prediction?.color ?? 'var(--accent-yellow)' }}
        />
      </motion.div>
    </div>
  )
}
