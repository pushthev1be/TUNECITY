import { useGameStore } from '../../stores/useGameStore.js'
import partsData from '../../data/parts.json'
import { PART_SPRITES } from '../../assets/spriteMap.js'

const SLOTS = [
  { key: 'engine',           label: 'Engine' },
  { key: 'engine_internals', label: 'Internals' },
  { key: 'intake',           label: 'Intake' },
  { key: 'forced_induction', label: 'Forced Induction' },
  { key: 'exhaust',          label: 'Exhaust' },
  { key: 'transmission',     label: 'Transmission' },
  { key: 'differential',     label: 'Differential' },
  { key: 'tires',            label: 'Tires' },
  { key: 'wheels',           label: 'Wheels' },
  { key: 'suspension',       label: 'Suspension' },
  { key: 'brakes',           label: 'Brakes' },
  { key: 'ecu',              label: 'ECU' },
  { key: 'cooling',          label: 'Cooling' },
  { key: 'weight_reduction', label: 'Weight' },
  { key: 'nitrous',          label: 'Nitrous' },
  { key: 'battery',          label: 'Battery' },
  { key: 'ignition_coil',    label: 'Ignition Coil' },
  { key: 'spark_plugs',      label: 'Spark Plugs' },
  { key: 'head_gasket',      label: 'Head Gasket' },
  { key: 'fuel_pump',        label: 'Fuel Pump' },
]

const TIER_COLORS = ['', 'text-gray-400', 'text-[var(--tag-character)]', 'text-[var(--accent-yellow)]', 'text-[var(--accent-red)]']

export function PartsList({ onSlotClick }) {
  const installedParts = useGameStore(s => s.installedParts)
  const uninstall = useGameStore(s => s.uninstallPart)

  return (
    <div className="space-y-1">
      {SLOTS.map(({ key, label }) => {
        const part = installedParts[key]
        return (
          <div
            key={key}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--panel-border)] transition-colors group"
          >
            <span className="flex items-center gap-1 text-[var(--text-muted)] text-xs w-28 shrink-0">
              {PART_SPRITES[key] && (
                <img src={PART_SPRITES[key]} alt="" className="w-4 h-4 object-contain opacity-60" style={{ imageRendering: 'pixelated' }} />
              )}
              {label}
            </span>
            {part ? (
              <>
                <span className={`text-xs flex-1 ${TIER_COLORS[part.tier] ?? ''}`}>
                  {part.name}
                </span>
                <button
                  onClick={() => uninstall(key)}
                  className="text-[var(--text-muted)] hover:text-[var(--accent-red)] text-xs transition-colors px-1"
                  title="Uninstall"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => onSlotClick?.(key)}
                className="text-[var(--text-muted)] text-xs flex-1 text-left hover:text-[var(--accent-yellow)] transition-colors"
              >
                — empty —
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
