import { useState, useEffect } from 'react'
import { play } from '../../utils/sfx.js'
import { useGameStore } from '../../stores/useGameStore.js'
import carsData from '../../data/cars.json'
import { CAR_SPRITES, CAR_ROTATION_KEYS, garage_bg } from '../../assets/spriteMap.js'
import { ExhaustFlames } from '../effects/ExhaustFlames.jsx'
import { IgnitionFlash } from '../effects/IgnitionFlash.jsx'

// Measured from the 256×256 garage_bg.png:
// Yellow lift-mat border: X 86–169 (center 127.5px), Y 109–173 (bottom 173px)
const CAR_X_PCT = 50.0
const CAR_Y_PCT = 89
const CAR_W_PCT = 46

export function GarageBay() {
  const activeCar      = useGameStore(s => s.activeCar)
  const setActiveCar   = useGameStore(s => s.setActiveCar)
  const ignitionResult = useGameStore(s => s.ignitionResult)
  const engineRunning  = useGameStore(s => s.engineRunning)
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

  const CAR_W_OVERRIDE = { ram_truck: 58, mystery_0e: 50, mystery_88: 50, mystery_ae: 50 }
  const carWidth = CAR_W_OVERRIDE[activeCar] ?? CAR_W_PCT

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">

      {/* Navigation arrows — always visible since all cars are browsable */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-[var(--accent-yellow)] hover:bg-black/80 hover:scale-110 rounded-full flex items-center justify-center text-xl z-20 transition-all cursor-pointer border border-[var(--panel-border)]"
      >◀</button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-[var(--accent-yellow)] hover:bg-black/80 hover:scale-110 rounded-full flex items-center justify-center text-xl z-20 transition-all cursor-pointer border border-[var(--panel-border)]"
      >▶</button>

      {/* 
          Senior Game Engineer "Overscan" Fix:
          1. The Background Layer fills the workspace and is scaled up (1.8x) 
             to guarantee it overflows and eliminates any black bars.
          2. The Interaction Layer is scaled by the EXACT same factor.
          3. This creates a "Stage" that is larger than the viewport, 
             providing a perfect immersive bleed while keeping alignment.
      */}
      <div className="absolute inset-0 bg-black overflow-hidden pointer-events-none">
        
        {/* Layer 1: The World (Background) */}
        <img
          src={garage_bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ 
            imageRendering: 'pixelated', 
            transform: 'scale(1.8)', // Forces the 1:1 art to cover widescreen
            objectPosition: 'center 55%' 
          }}
        />

        {/* Layer 2: The Stage (Car & Effects) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="relative w-full h-full" 
            style={{ transform: 'scale(1.8)' }} // Matches background scale exactly
          >
            {/* Exhaust flames — positioned using the same % coordinates */}
            <ExhaustFlames active={showFlames} carId={activeCar} />

            {/* Car sprite */}
            {sprite && (
              <div
                style={{
                  position: 'absolute',
                  left:     `${CAR_X_PCT}%`,
                  top:      `${CAR_Y_PCT}%`,
                  width:    `${carWidth}%`,
                  height:   'auto',
                  transform:'translate(-50%, -100%)',
                  zIndex:   10
                }}
              >
                <img
                  src={sprite}
                  alt={car?.name ?? ''}
                  style={{
                    width:          '100%',
                    height:         'auto',
                    imageRendering: 'pixelated',
                    display:        'block',
                    filter:         isLocked
                      ? 'grayscale(100%) brightness(0.35) drop-shadow(0 8px 20px rgba(0,0,0,0.8))'
                      : showFlames
                        ? 'drop-shadow(0 0 12px rgba(255,140,0,0.6)) drop-shadow(0 8px 20px rgba(0,0,0,0.8))'
                        : 'drop-shadow(0 8px 20px rgba(0,0,0,0.8))',
                    transition:     'filter 0.4s ease',
                  }}
                />
                {isLocked && (
                  <div style={{
                    position:       'absolute',
                    inset:          0,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))' }}>🔒</span>
                  </div>
                )}
              </div>
            )}

          {/* Ignition flash */}
          {ignitionSuccess && (
            <IgnitionFlash
              active={!flashDone && ignitionSuccess}
              onDone={() => setFlashDone(true)}
            />
          )}
        </div>
      </div>

      </div>

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
