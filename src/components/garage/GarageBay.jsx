import { useState, useEffect } from 'react'
import { play, startLoop, stopLoop } from '../../utils/sfx.js'
import { useGameStore } from '../../stores/useGameStore.js'
import carsData from '../../data/cars.json'
import { CAR_SPRITES, CAR_ROTATION_KEYS, garage_bg } from '../../assets/spriteMap.js'
import { ExhaustFlames } from '../effects/ExhaustFlames.jsx'
import { IgnitionFlash } from '../effects/IgnitionFlash.jsx'
import { FailureEffects } from '../effects/FailureEffects.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import { statePack, lidName } from '../../assets/carStates.js'
import { CarStage, SpinViewer } from './CarStage.jsx'
import { StorageHall } from './StorageHall.jsx'

// garage_bg.png and every car sprite share the same 256×256 pixel grid; each car
// is drawn parked on the lift mat (center X 127.5, bottom Y 173). The room itself
// only covers pixels 65–190, so the stage is sized to fit the room's width and the
// car-and-lift band (Y 60–180) into the bay; a blurred backdrop fills any spare edge.
const STAGE_SIZE = 'min(100cqw * 2.05, 100cqh * 2.13)'

// Cars are drawn a bit smaller than the art grid so they sit inside the lift mat
// with room around them, scaled about the mat's bottom-center so wheels stay put.
const CAR_SCALE  = 0.6
const CAR_ORIGIN = { x: 49.8, y: 67.6 }

const SHAKES = {
  still:  { animate: { x: 0, y: 0 }, transition: { duration: 0 } },
  crank:  { animate: { x: [0, -2, 2, -1, 1, 0], y: [0, 1, -1, 0] }, transition: { duration: 0.22, repeat: Infinity } },
  catch:  { animate: { y: [0, -7, 4, -2, 1, 0] }, transition: { duration: 0.45, ease: 'easeOut' } },
  blowup: { animate: { x: [0, -14, 12, -10, 8, -5, 3, 0], y: [0, 8, -6, 5, -3, 2, 0] }, transition: { duration: 0.7, ease: 'easeOut' } },
}

// Failures that end in flames rather than just smoke
const FIRE_TAGS = new Set(['grenaded', 'overheated', 'hydrolocked'])

export function GarageBay() {
  const activeCar      = useGameStore(s => s.activeCar)
  const setActiveCar   = useGameStore(s => s.setActiveCar)
  const ignitionResult = useGameStore(s => s.ignitionResult)
  const engineRunning  = useGameStore(s => s.engineRunning)
  const ignitionState  = useGameStore(s => s.ignitionState)
  const ownedCars      = useGameStore(s => s.ownedCars)
  const ownedCarIds    = ownedCars.map(c => c.car_id)

  const browsableCars  = carsData
  const currentIndex   = browsableCars.findIndex(c => c.id === activeCar)
  const car            = browsableCars.find(c => c.id === activeCar) ?? browsableCars[0] ?? null
  const sprite         = CAR_SPRITES[activeCar]
  const isLocked       = !ownedCarIds.includes(activeCar)

  // Show flames while engine is running (persists after result dismissed)
  const ignitionSuccess = ignitionResult?.outcome !== 'catastrophic_failure' && !!ignitionResult
  const showFlames      = ignitionSuccess || engineRunning
  const [flashDone, setFlashDone] = useState(false)
  // Cars rendered from Blender as layered states get the dyno stage and its controls
  const pack = statePack(activeCar)
  const [hoodOpen, setHoodOpen]   = useState(false)
  const [lightsPref, setLights]   = useState(null)   // null = follow the engine
  const [spinOpen, setSpinOpen]   = useState(false)
  const [storageOpen, setStorage] = useState(false)
  useEffect(() => { setHoodOpen(false); setLights(null) }, [activeCar])
  const blewUp = ignitionResult?.outcome === 'catastrophic_failure' && !ignitionResult.isTestFit
  const shake  = ignitionState === 'animating' ? 'crank'
    : blewUp ? 'blowup'
    : ignitionSuccess && !ignitionResult.isTestFit ? 'catch'
    : 'still'

  // Idle loop while the engine runs; starts once the start-up clip has settled
  useEffect(() => {
    if (!engineRunning) return
    const t = setTimeout(() => startLoop('idle', { fadeIn: 0.6 }), 1400)
    return () => { clearTimeout(t); stopLoop('idle') }
  }, [engineRunning])

  useEffect(() => {
    if (!ignitionResult) return
    setFlashDone(false)
  }, [ignitionResult])

  function handlePrev() {
    play('cursor')
    const idx = (currentIndex - 1 + browsableCars.length) % browsableCars.length
    setActiveCar(browsableCars[idx].id)
  }
  function handleNext() {
    play('cursor')
    const idx = (currentIndex + 1) % browsableCars.length
    setActiveCar(browsableCars[idx].id)
  }

  return (
    <div className="absolute inset-0 bg-black overflow-hidden flex flex-col">

      {/* Top bar: which car, and switching between them. Nothing sits on the car itself. */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 bg-[var(--panel-bg)] border-b border-[var(--panel-border)] z-20">
        <button onClick={handlePrev} aria-label="Previous car"
          className="w-8 h-8 shrink-0 rounded-full border border-[var(--panel-border)] text-[var(--accent-yellow)] hover:bg-[var(--panel-border)] cursor-pointer">◀</button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{car?.name}</p>
          <p className="text-[var(--text-muted)] text-[11px] leading-tight truncate">
            {isLocked
              ? '🔒 Locked — clear missions to unlock'
              : `${car?.driveline} · Tier ${car?.tier} · ${car?.starting_condition}`}
            <span className="ml-2 opacity-70">{currentIndex + 1}/{browsableCars.length}</span>
          </p>
        </div>
        <button onClick={handleNext} aria-label="Next car"
          className="w-8 h-8 shrink-0 rounded-full border border-[var(--panel-border)] text-[var(--accent-yellow)] hover:bg-[var(--panel-border)] cursor-pointer">▶</button>
      </div>

      {/* The scene */}
      <div className="relative flex-1 min-h-0 overflow-hidden" style={{ containerType: 'size' }}>

      {/* Backdrop: blurred garage so wide or tall bays never show black bars */}
      <img
        src={garage_bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scale(2.2)', filter: 'blur(8px) brightness(0.45)' }}
      />

      {/* Camera shake wraps the stage: rumble while cranking, jolt on start, heavy hit on blowup */}
      <motion.div
        key={shake}
        className="absolute inset-0 pointer-events-none"
        animate={SHAKES[shake].animate}
        transition={SHAKES[shake].transition}
      >
      {pack ? (
        <CarStage pack={pack} hoodOpen={hoodOpen} lightsOn={lightsPref ?? undefined} locked={isLocked} />
      ) : (
      /* Stage: square, centered on the car-and-lift band, shared by background, car and effects */
      <div
        className="absolute pointer-events-none"
        style={{
          width:  STAGE_SIZE,
          height: STAGE_SIZE,
          left:   '50%',
          top:    '50%',
          transform: 'translate(-50%, -47%)',
        }}
      >
        <img
          src={garage_bg}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Flames stay outside the scaled car layer so their screen blend reaches the garage */}
        <ExhaustFlames active={showFlames} carId={activeCar} scale={CAR_SCALE} origin={CAR_ORIGIN} />

        <div
          className="absolute inset-0"
          style={{ transform: `scale(${CAR_SCALE})`, transformOrigin: `${CAR_ORIGIN.x}% ${CAR_ORIGIN.y}%`, zIndex: 10 }}
        >

        {sprite && (
          <img
            src={sprite}
            alt={car?.name ?? ''}
            className="absolute inset-0 w-full h-full"
            style={{
              imageRendering: 'pixelated',
              zIndex:         10,
              filter:         isLocked
                ? 'grayscale(100%) brightness(0.35) drop-shadow(0 1.5cqh 2cqh rgba(0,0,0,0.8))'
                : showFlames
                  ? 'drop-shadow(0 0 1.5cqh rgba(255,140,0,0.6)) drop-shadow(0 1.5cqh 2cqh rgba(0,0,0,0.8))'
                  : 'drop-shadow(0 1.5cqh 2cqh rgba(0,0,0,0.8))',
              transition:     'filter 0.4s ease',
              animation:      engineRunning ? 'idle-rumble 0.12s steps(1) infinite' : 'none',
            }}
          />
        )}

        {sprite && isLocked && (
          <span
            className="absolute"
            style={{
              left: '50%', top: '48%', transform: 'translate(-50%, -50%)', zIndex: 11,
              fontSize: '6cqh', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))',
            }}
          >🔒</span>
        )}
        </div>

        {ignitionSuccess && (
          <IgnitionFlash
            active={!flashDone && ignitionSuccess}
            onDone={() => setFlashDone(true)}
          />
        )}

        {blewUp && <FailureEffects fire={FIRE_TAGS.has(ignitionResult.tag)} />}
      </div>
      )}
      {pack && ignitionSuccess && (
        <IgnitionFlash active={!flashDone && ignitionSuccess} onDone={() => setFlashDone(true)} />
      )}
      </motion.div>

      </div>

      {/* Bottom bar: storage, the view controls, and what the engine is doing */}
      <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 bg-[var(--panel-bg)] border-t border-[var(--panel-border)] z-20">
        <button onClick={() => { play('cursor'); setStorage(true) }}
          className="px-3 h-8 rounded-full text-[11px] font-bold tracking-widest uppercase border cursor-pointer bg-black/40 text-[var(--accent-yellow)] border-[var(--panel-border)] hover:bg-[var(--panel-border)]">
          ▦ Storage
        </button>
        <EngineChip state={ignitionState} running={engineRunning} failed={blewUp || (ignitionResult?.outcome === 'catastrophic_failure' && !ignitionResult?.isTestFit)} />
        {pack && !isLocked && (
          <div className="ml-auto flex rounded-full border border-[var(--panel-border)] overflow-hidden">
            {[
              { label: lidName(pack) === 'hood' ? 'Hood' : 'Engine lid', on: hoodOpen, act: () => setHoodOpen(v => !v) },
              { label: 'Lights', on: lightsPref ?? engineRunning, act: () => setLights(v => !(v ?? engineRunning)) },
              { label: '360°', on: false, act: () => setSpinOpen(true) },
            ].map((b, i) => (
              <button key={b.label} onClick={() => { play('cursor'); b.act() }} aria-pressed={b.on}
                className={`px-3 h-8 text-[11px] font-bold tracking-widest uppercase cursor-pointer transition-colors ${i ? 'border-l border-[var(--panel-border)]' : ''} ${
                  b.on ? 'bg-[var(--accent-yellow)] text-black' : 'bg-black/40 text-[var(--accent-yellow)] hover:bg-[var(--panel-border)]'}`}>
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {pack && spinOpen && <SpinViewer pack={pack} onClose={() => setSpinOpen(false)} />}
        {storageOpen && <StorageHall onClose={() => setStorage(false)} />}
      </AnimatePresence>

    </div>
  )
}

// What the engine is doing, in one word, beside the controls
function EngineChip({ state, running, failed }) {
  const [label, color] = state === 'animating' ? ['Cranking', '#ffb020']
    : failed ? ['Failed', '#ff3b30']
    : running ? ['Running', '#34c759']
    : ['Engine off', '#8e8e93']
  return (
    <span className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-black/40 border border-[var(--panel-border)] text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: running || state === 'animating' ? `0 0 6px ${color}` : 'none' }} />
      {label}
    </span>
  )
}
