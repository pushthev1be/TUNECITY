import { useState, useEffect } from 'react'
import { play, startLoop, stopLoop } from '../../utils/sfx.js'
import { useGameStore } from '../../stores/useGameStore.js'
import carsData from '../../data/cars.json'
import { CAR_SPRITES, CAR_ROTATION_KEYS, garage_bg } from '../../assets/spriteMap.js'
import { ExhaustFlames } from '../effects/ExhaustFlames.jsx'
import { IgnitionFlash } from '../effects/IgnitionFlash.jsx'
import { FailureEffects } from '../effects/FailureEffects.jsx'
import { motion } from 'framer-motion'

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
    <div className="absolute inset-0 bg-black overflow-hidden" style={{ containerType: 'size' }}>

      {/* Navigation arrows — always visible since all cars are browsable */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-[var(--accent-yellow)] hover:bg-black/80 hover:scale-110 rounded-full flex items-center justify-center text-xl z-20 transition-all cursor-pointer border border-[var(--panel-border)]"
      >◀</button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-[var(--accent-yellow)] hover:bg-black/80 hover:scale-110 rounded-full flex items-center justify-center text-xl z-20 transition-all cursor-pointer border border-[var(--panel-border)]"
      >▶</button>

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
      {/* Stage: square, centered on the car-and-lift band, shared by background, car and effects */}
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
      </motion.div>

      {/* Car label */}
      {car && (
        <div className="absolute top-4 left-4 z-10">
          <p className="text-[var(--text-primary)] font-bold text-base tracking-wide drop-shadow-lg">
            {car.name}
          </p>
          <p className="text-[var(--text-muted)] text-sm drop-shadow-lg">
            {isLocked
              ? '🔒 Locked — complete prior missions to unlock'
              : `${car.driveline} · Tier ${car.tier} · ${car.starting_condition}`}
          </p>
        </div>
      )}
    </div>
  )
}
