import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../stores/useGameStore.js'
import carsData from '../../data/cars.json'
import hall from '../../assets/sprites/storage/hall.png'
import storage from '../../assets/sprites/storage/storage.json'
import { statePack, sheet, buildLook } from '../../assets/carStates.js'
import { Layer } from './CarStage.jsx'
import { play } from '../../utils/sfx.js'

// The storage garage: every car parked in its numbered bay, in cars.json order.
// The hall is one wide pixel strip from Blender (art/blender/tunecity_storage.py),
// drawn from the same camera as the 360 view, so each parked car is just that
// car's 360 sprite at one angle, moved to its bay: with its own wheels and parts.

function ParkedCar({ car, bay, scale, owned, active, onPick }) {
  const pack = statePack(car.id)
  const installed = useGameStore(s => s.installedPartsByCar[car.id])
  const origin = storage.cars[car.id]
  if (!pack || !origin) return null
  const look = buildLook(installed ?? {})
  const f = storage.park_frame
  // the 360 frames are re-centred per angle; move the parked car by the same amount
  const [dx, dy] = pack.manifest.views.spin.offsets?.[f] ?? [0, 0]
  const S = (layer, variant) => sheet(pack, 'spin', layer, variant)
  const size = 256 * scale
  return (
    <button
      onClick={() => onPick(car)}
      className="absolute cursor-pointer group"
      style={{
        left: (bay.x - origin.ox - dx) * scale, top: (bay.y - origin.oy - dy) * scale,
        width: size, height: size,
        filter: owned ? 'none' : 'grayscale(1) brightness(0.35)',
        // only the car itself takes clicks, not the empty corners of its sprite
        clipPath: 'inset(28% 12% 22% 12%)',
      }}
      aria-label={owned ? `Bring the ${car.name} to the dyno` : `${car.name} (locked)`}
    >
      <div className="absolute inset-0 transition-transform duration-150 group-hover:-translate-y-[1.5%]">
        <Layer s={S('shadow', 'base')} frame={f} />
        <Layer s={S('tires', look.tires)} frame={f} />
        <Layer s={S('brakes', look.brakes)} frame={f} />
        <Layer s={S('rims', look.rims)} frame={f} />
        <div className="absolute inset-0" style={{ transform: `translateY(${(look.dropPx / 256) * 100}%)` }}>
          <Layer s={S('body', look.body)} frame={f} />
          <Layer s={S('exhaust', look.exhaust)} frame={f} />
          {look.fmic && <Layer s={S('fmic', 'base')} frame={f} />}
        </div>
      </div>
      {!owned && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ fontSize: 22 * scale * 2 }}>🔒</span>}
      {active && (
        <span className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[var(--accent-yellow)] text-black font-bold uppercase tracking-widest"
          style={{ top: '30%', fontSize: Math.max(9, 7 * scale) }}>On dyno</span>
      )}
    </button>
  )
}

export function StorageHall({ onClose }) {
  const ownedCars    = useGameStore(s => s.ownedCars)
  const activeCar    = useGameStore(s => s.activeCar)
  const setActiveCar = useGameStore(s => s.setActiveCar)
  const owned = new Set(ownedCars.map(c => c.car_id))
  const scroller = useRef(null)

  // Scale the strip to the viewport height, in whole pixel steps where it fits
  const vh = typeof window !== 'undefined' ? window.innerHeight : 640
  const scale = Math.max(1, Math.floor((vh * 0.78) / storage.h)) || 1
  const fit = Math.min(scale, (vh * 0.78) / storage.h)

  // Open on the car that is on the dyno
  useEffect(() => {
    const i = carsData.findIndex(c => c.id === activeCar)
    const bay = storage.bays[i]
    if (bay && scroller.current) scroller.current.scrollLeft = bay.x * fit - scroller.current.clientWidth / 2
  }, [activeCar, fit])

  function pick(car) {
    if (!owned.has(car.id)) { play('cursor'); return }
    play('cursor')
    setActiveCar(car.id)
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[var(--text-primary)] font-bold tracking-widest uppercase text-sm">Storage</p>
          <p className="text-[var(--text-muted)] text-xs">Tap a car to put it on the dyno. Locked bays open as you clear missions.</p>
        </div>
        <button onClick={onClose}
          className="px-4 h-9 rounded-full bg-[var(--accent-yellow)] text-black text-xs font-bold tracking-widest uppercase">Close</button>
      </div>
      <div ref={scroller} className="flex-1 overflow-x-auto overflow-y-hidden flex items-center">
        <div className="relative shrink-0" style={{ width: storage.w * fit, height: storage.h * fit }}>
          <img src={hall} alt="" className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }} />
          {carsData.map((car, i) => storage.bays[i] && (
            <ParkedCar key={car.id} car={car} bay={storage.bays[i]} scale={fit}
              owned={owned.has(car.id)} active={car.id === activeCar} onPick={pick} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
