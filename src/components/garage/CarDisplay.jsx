import { useGameStore } from '../../stores/useGameStore.js'
import carsData from '../../data/cars.json'
import { CAR_SPRITES } from '../../assets/spriteMap.js'

export function CarDisplay() {
  const activeCar = useGameStore(s => s.activeCar)
  const car = carsData.find(c => c.id === activeCar)
  const sprite = CAR_SPRITES[activeCar]

  return (
    <div className="flex flex-col items-center gap-2">
      {sprite ? (
        <img
          src={sprite}
          alt={car?.name ?? activeCar}
          style={{
            imageRendering: 'pixelated',
            width: 'clamp(160px, 22vw, 280px)',
            height: 'auto',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.8))',
          }}
        />
      ) : (
        <div
          style={{ width: 220, height: 160 }}
          className="flex items-center justify-center"
        >
          <span className="text-8xl opacity-30">🚗</span>
        </div>
      )}
      {car && (
        <div className="text-center">
          <p className="text-[var(--text-primary)] font-bold text-sm tracking-wide">{car.name}</p>
          <p className="text-[var(--text-muted)] text-xs">
            {car.driveline} · Tier {car.tier} · {car.starting_condition}
          </p>
        </div>
      )}
    </div>
  )
}
