import { useGameStore } from '../../stores/useGameStore.js'
import { resolveIgnition } from '../../engine/ignition/resolveIgnition.js'
import { play } from '../../utils/sfx.js'

const FAILING_STATES  = new Set(['dead', 'catastrophic'])
const RISKY_STATES    = new Set(['detonation_risk', 'unstable', 'rough_idle'])
const TURBO_TAGS      = new Set(['turbo_surge', 'boost_spike', 'overboost'])

export function IgnitionButton({ onIgnite }) {
  const computed        = useGameStore(s => s.computed)
  const ignitionState   = useGameStore(s => s.ignitionState)
  const ignitionResult  = useGameStore(s => s.ignitionResult)
  const engineRunning   = useGameStore(s => s.engineRunning)
  const startAnimation  = useGameStore(s => s.startIgnitionAnimation)
  const setResult       = useGameStore(s => s.setIgnitionResult)
  const getActiveCar    = useGameStore(s => s.getActiveCar)
  const getObjective    = useGameStore(s => s.getActiveObjective)
  const destroyParts    = useGameStore(s => s.destroyParts)
  const completeObj     = useGameStore(s => s.completeObjective)
  const showComplete    = useGameStore(s => s.showMissionComplete)
  const activeObjId     = useGameStore(s => s.activeObjectiveId)
  const installedParts  = useGameStore(s => s.installedParts)

  const prediction    = computed?.prediction ?? { state: 'dead', label: "No Build", confidence: 0, color: '#6b7280' }
  const willFail      = FAILING_STATES.has(prediction.state)
  const isRisky       = RISKY_STATES.has(prediction.state)
  const confidencePct = Math.round((prediction.confidence ?? 0) * 100)

  // Show Rev button when engine successfully started (result overlay dismissed or still showing)
  const showRev = engineRunning && ignitionState !== 'animating'

  function handleIgnite() {
    if (ignitionState !== 'idle') return
    play('select')
    startAnimation()

    setTimeout(() => {
      const car = getActiveCar()
      const objective = getObjective()
      const build = { car_id: car?.id, installed_parts: installedParts, computed }
      const result = resolveIgnition(build, car, objective)

      const activeTags = computed?.activeTags ?? []
      const hasTurbo   = activeTags.some(t => TURBO_TAGS.has(t.id))

      if (result.outcome === 'catastrophic_failure') {
        play(hasTurbo ? 'turbo_fail' : 'engine_fail')
        destroyParts(result.destroyed_slots)
      } else if (result.outcome === 'success' && result.objective_met && activeObjId) {
        play('car_start')
        completeObj(activeObjId)
        showComplete({ objective, result })
      } else if (result.outcome === 'success') {
        play('car_start')
      } else {
        play('ignition_fail')
      }

      setResult(result)
      onIgnite?.(result)
    }, 3500)
  }

  function handleTestFit() {
    if (ignitionState !== 'idle') return
    play('cursor')
    const car = getActiveCar()
    const objective = getObjective()
    const build = { car_id: car?.id, installed_parts: installedParts, computed }
    const result = resolveIgnition(build, car, objective)
    setResult({ ...result, isTestFit: true })
  }

  function handleRev() {
    play('rev')
  }

  const disabled = ignitionState !== 'idle'

  const btnColor = willFail
    ? 'bg-[var(--accent-red)] text-white hover:brightness-110'
    : isRisky
    ? 'bg-orange-500 text-white hover:brightness-110'
    : 'bg-[var(--accent-yellow)] text-black hover:brightness-110'

  const statusColor = willFail
    ? 'text-[var(--accent-red)]'
    : isRisky
    ? 'text-orange-400'
    : 'text-[var(--tag-positive)]'

  const statusIcon = willFail ? '⚠' : isRisky ? '⚡' : '✓'

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleIgnite}
        disabled={disabled}
        className={`
          w-full py-4 rounded-lg font-bold text-lg tracking-widest uppercase
          transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
          ${btnColor}
          ${ignitionState === 'animating' ? 'animate-pulse' : ''}
        `}
      >
        {ignitionState === 'animating' ? 'Starting...' : 'IGNITE'}
      </button>

      {/* Rev button — shown while engine is running */}
      {showRev && (
        <button
          onClick={handleRev}
          className="w-full py-2 rounded-lg font-bold text-sm tracking-widest uppercase
            bg-[var(--panel-border)] text-[var(--accent-yellow)]
            hover:bg-[var(--accent-yellow)]/20 hover:scale-[1.02]
            active:scale-[0.97] transition-all duration-100 cursor-pointer
            border border-[var(--accent-yellow)]/40"
        >
          REV ENGINE
        </button>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={handleTestFit}
          disabled={disabled}
          className="text-[var(--text-muted)] text-xs hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors"
        >
          Test Fit (no risk)
        </button>
        <span className={`text-xs font-bold ${statusColor}`}>
          {statusIcon} {prediction.label}
          <span className="text-[var(--text-muted)] font-normal ml-1">({confidencePct}%)</span>
        </span>
      </div>
    </div>
  )
}
