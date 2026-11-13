import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../stores/useGameStore.js'
import { sheet, viewSize, buildLook } from '../../assets/carStates.js'
import { FireColumn } from '../effects/FailureEffects.jsx'

// Failures where the engine never fires: no smoke from the hood, just a sputter
const NO_START = new Set(['wont_turn_over', 'no_spark', 'no_compression', 'fuel_starved'])
const FIRE_TAGS = new Set(['grenaded', 'overheated', 'hydrolocked'])
// Rough-running predictions that smoke from the tailpipe even without a smoke colour
const ROUGH = new Set(['detonation_risk', 'unstable', 'rough_idle'])
// The game's smoke colours, as filters over the black smoke sheets
const SMOKE_TINT = {
  black: 'none',
  grey:  'brightness(2.6)',
  white: 'brightness(5) saturate(0)',
  blue:  'brightness(2.4) sepia(1) hue-rotate(170deg) saturate(2.5)',
}
const DYNO_RUN_MS = 2600
const PUFF_MS = 600

/** A counter that ticks at `fps` while `active`, for stepping sprite frames. */
export function useTicker(fps, active = true) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active || !fps) return
    setN(0)   // each run starts on its first frame
    const id = setInterval(() => setN(v => v + 1), 1000 / fps)
    return () => clearInterval(id)
  }, [fps, active])
  return n
}

/** One sprite-sheet layer, full canvas, showing frame `frame` (wrapped). */
export function Layer({ s, frame = 0, style }) {
  if (!s) return null
  const f = ((frame % s.frames) + s.frames) % s.frames
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `url(${s.url})`,
        backgroundSize: `${s.frames * 100}% 100%`,
        backgroundPosition: `${s.frames > 1 ? (f / (s.frames - 1)) * 100 : 0}% 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  )
}

/** Sprung layers move down by the ride-height drop, in canvas pixels. */
function Sprung({ dropPx, h, children, style }) {
  return (
    <div className="absolute inset-0" style={{ transform: `translateY(${(dropPx / h) * 100}%)`, ...style }}>
      {children}
    </div>
  )
}

/**
 * The car on the dyno: every visible part stacked from its own sprite sheet.
 * Fills its parent (cover), keeping the canvas aspect.
 */
export function CarStage({ pack, hoodOpen, lightsOn, locked }) {
  const installed      = useGameStore(s => s.installedParts)
  const engineRunning  = useGameStore(s => s.engineRunning)
  const ignitionState  = useGameStore(s => s.ignitionState)
  const ignitionResult = useGameStore(s => s.ignitionResult)
  const computed       = useGameStore(s => s.computed)
  const revCount       = useGameStore(s => s.revCount)
  const damage         = useGameStore(s => s.damageByCar?.[s.activeCar])

  const look = buildLook(installed)
  const { w, h } = viewSize(pack, 'dyno')
  const L = (layer, variant) => sheet(pack, 'dyno', layer, variant)

  const cranking = ignitionState === 'animating'
  const real     = ignitionResult && !ignitionResult.isTestFit
  const failed   = real && ignitionResult.outcome === 'catastrophic_failure'
  const blewUp   = failed && !NO_START.has(ignitionResult.tag)
  // No battery / dead electrics: no lights, no crank flicker, nothing turns
  const hasPower = !(computed?.activeTags ?? []).some(t => t.id === 'wont_turn_over')
  // A mechanical failure smokes until every destroyed part is replaced, not just
  // until the result goes away. Overheating vents white steam; the rest is black.
  const smoking  = !!damage?.slots?.length && !NO_START.has(damage.tag)
  const steam    = damage?.tag === 'overheated'
  const smokeTint = engineRunning && look.exhaust
    ? (computed?.smokeColor ?? (ROUGH.has(computed?.prediction?.state) ? 'black' : null))
    : null

  // The catch: a single puff from the exhaust the moment it fires (or sputters out)
  const [puffKey, setPuffKey] = useState(0)
  const [puffing, setPuffing] = useState(false)
  useEffect(() => {
    if (!real) return
    if (ignitionResult.noPower || !look.exhaust) return
    if (ignitionResult.outcome === 'success' || NO_START.has(ignitionResult.tag)) {
      setPuffKey(k => k + 1); setPuffing(true)
      const t = setTimeout(() => setPuffing(false), PUFF_MS)
      return () => clearTimeout(t)
    }
  }, [ignitionResult, real])
  const puffFrame = useTicker(16, puffing)

  // A rev runs the dyno: driven wheels and rollers turn, the fan spins up
  const [dyno, setDyno] = useState(false)
  useEffect(() => {
    if (!revCount || !engineRunning) return
    setDyno(true)
    const t = setTimeout(() => setDyno(false), DYNO_RUN_MS)
    return () => clearTimeout(t)
  }, [revCount, engineRunning])

  const [burning, setBurning] = useState(false)
  useEffect(() => {
    if (!blewUp || !FIRE_TAGS.has(ignitionResult?.tag)) { setBurning(false); return }
    setBurning(true)
    const t = setTimeout(() => setBurning(false), 4500)
    return () => clearTimeout(t)
  }, [blewUp, ignitionResult])

  const idle  = useTicker(cranking ? 22 : 14, engineRunning || cranking)
  const wheel = useTicker(30, dyno)
  const smoke = useTicker(12, !!smokeTint || smoking)
  const fume  = useTicker(10, engineRunning && !!look.exhaust)
  // Cranking: the lights stutter with the battery sag before the engine catches
  const flick = useTicker(9, cranking && hasPower)
  const idleFrame = engineRunning || cranking ? idle : 0
  const lit = hasPower && (cranking || (lightsOn ?? engineRunning))
  const FLICKER = [0, 0.85, 0.15, 1, 0.4, 0, 0.9, 0.25, 0.7, 0.05, 1, 0.5]
  const lightOpacity = cranking ? FLICKER[flick % FLICKER.length] : 1

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" style={{ containerType: 'size' }}>
      {/* Whatever the canvas does not cover gets a soft, dark copy of the garage */}
      <div className="absolute inset-0 pointer-events-none" style={{ filter: 'blur(10px) brightness(0.4)', transform: 'scale(1.15)' }}>
        <Layer s={L('garage', 'base')} style={{ backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </div>
      {/* The whole dyno bay always shows: fit the canvas inside, never crop it */}
      <div
        className="absolute"
        style={{
          width: `min(100cqw, calc(100cqh * ${w / h}))`,
          aspectRatio: `${w} / ${h}`,
          left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        }}
      >
        <Layer s={L('garage', 'base')} />
        <Layer s={L('rollers', 'base')} frame={dyno ? wheel : 0} />
        <div className="absolute inset-0" style={{ filter: locked ? 'grayscale(1) brightness(0.4)' : 'none', transition: 'filter 0.4s' }}>
          <Layer s={L('shadow', 'base')} />
          <Layer s={L('tires', look.tires)} frame={dyno ? wheel : 0} />
          <Layer s={L('brakes', look.brakes)} />
          <Layer s={L('rims', look.rims)} frame={dyno ? wheel : 0} />
          <Sprung dropPx={look.dropPx} h={h}>
            <Layer s={L('body', `${look.body}_${hoodOpen ? 'open' : 'closed'}`)} frame={idleFrame} />
            {look.exhaust && <Layer s={L('exhaust', look.exhaust)} frame={idleFrame} />}
            {look.fmic && <Layer s={L('fmic', 'base')} frame={idleFrame} />}
            {hoodOpen && (
              <>
                {look.engine && <Layer s={L('engine', look.engine)} frame={idleFrame} />}
                {look.headers && <Layer s={L('headers', 'base')} frame={idleFrame} />}
                {look.fi && <Layer s={L('fi', look.fi)} frame={idleFrame} />}
                {look.intake && <Layer s={L('intake', look.intake)} frame={idleFrame} />}
              </>
            )}
            {lit && <Layer s={L('lights', 'base')} frame={idleFrame} style={{ opacity: lightOpacity }} />}
            {/* running: thin white vapour, the sign it is alive */}
            {engineRunning && look.exhaust && <Layer s={L('fumes', look.smokeFrom)} frame={fume} style={{ opacity: 0.7 }} />}
            {smokeTint && (
              <Layer s={L('smoke_exhaust', look.smokeFrom)} frame={smoke} style={{ filter: SMOKE_TINT[smokeTint] }} />
            )}
            {smoking && <Layer s={L('smoke_hood', 'base')} frame={smoke} style={{ filter: steam ? SMOKE_TINT.white : 'none', opacity: steam ? 0.85 : 1 }} />}
            {puffing && (
              <Layer key={puffKey} s={L('start_puff', look.smokeFrom)} frame={Math.min(puffFrame, 9)}
                style={{ filter: failed ? 'brightness(0.6)' : 'none' }} />
            )}
          </Sprung>
          {burning && (
            <>
              <FireColumn x={62} y={66} width={6} />
              <FireColumn x={68} y={65} width={7} delay={150} />
            </>
          )}
        </div>
        {locked && (
          <span className="absolute" style={{ left: '52%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '6cqh' }}>🔒</span>
        )}
      </div>
    </div>
  )
}

/** Full-screen 360 view: drag to turn, or let it turn by itself. */
export function SpinViewer({ pack, onClose }) {
  const installed = useGameStore(s => s.installedParts)
  const look = buildLook(installed)
  const { w, h } = viewSize(pack, 'spin')
  const S = (layer, variant) => sheet(pack, 'spin', layer, variant)
  const n = S('body', look.body)?.frames ?? 16

  const [angle, setAngle] = useState(0)
  const [auto, setAuto] = useState(true)
  const tick = useTicker(6, auto)
  useEffect(() => { if (auto) setAngle(a => a + 1) }, [tick, auto])

  const drag = useRef(null)
  const STEP_PX = 14
  function down(e) { drag.current = { x: e.clientX, a: angle }; setAuto(false); e.currentTarget.setPointerCapture(e.pointerId) }
  function move(e) {
    if (!drag.current) return
    setAngle(drag.current.a + Math.round((drag.current.x - e.clientX) / STEP_PX))
  }
  function up() { drag.current = null }
  const a = ((angle % n) + n) % n

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{ width: 'min(92vw, 72vh)', aspectRatio: `${w} / ${h}` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      >
        <div className="absolute rounded-[50%]" style={{ left: '12%', right: '12%', top: '62%', bottom: '18%',
          background: 'radial-gradient(closest-side, rgba(255,214,0,0.10), transparent)' }} />
        <Layer s={S('shadow', 'base')} frame={a} />
        <Layer s={S('tires', look.tires)} frame={a} />
        <Layer s={S('brakes', look.brakes)} frame={a} />
        <Layer s={S('rims', look.rims)} frame={a} />
        <Sprung dropPx={look.dropPx} h={h}>
          <Layer s={S('body', look.body)} frame={a} />
          {look.exhaust && <Layer s={S('exhaust', look.exhaust)} frame={a} />}
          {look.fmic && <Layer s={S('fmic', 'base')} frame={a} />}
        </Sprung>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button className="w-10 h-10 rounded-full bg-black/60 border border-[var(--panel-border)] text-[var(--accent-yellow)]"
          onClick={() => { setAuto(false); setAngle(v => v - 1) }}>◀</button>
        <button className="px-4 h-10 rounded-full bg-black/60 border border-[var(--panel-border)] text-[var(--text-primary)] text-xs font-bold tracking-widest uppercase"
          onClick={() => setAuto(v => !v)}>{auto ? 'Pause' : 'Spin'}</button>
        <button className="w-10 h-10 rounded-full bg-black/60 border border-[var(--panel-border)] text-[var(--accent-yellow)]"
          onClick={() => { setAuto(false); setAngle(v => v + 1) }}>▶</button>
        <button className="px-4 h-10 rounded-full bg-[var(--accent-yellow)] text-black text-xs font-bold tracking-widest uppercase"
          onClick={onClose}>Close</button>
      </div>
      <p className="text-[var(--text-muted)] text-xs mt-2">Drag to turn the car</p>
    </motion.div>
  )
}

export { AnimatePresence }
