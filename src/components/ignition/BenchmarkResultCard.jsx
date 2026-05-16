import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/useGameStore.js'
import { Card } from '../shared/Card.jsx'
import { Button } from '../shared/Button.jsx'

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === undefined || target === null) return
    const steps = 40
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      setValue(parseFloat((target * (step / steps)).toFixed(2)))
      if (step >= steps) { clearInterval(timer); setValue(target) }
    }, interval)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

function Stat({ label, value, unit }) {
  const displayed = useCountUp(value)
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-[var(--accent-yellow)]">
        {typeof value === 'number' ? displayed.toFixed(value % 1 !== 0 ? 2 : 0) : '—'}
        <span className="text-sm text-[var(--text-muted)] ml-1">{unit}</span>
      </div>
      <div className="text-xs text-[var(--text-muted)] uppercase mt-1">{label}</div>
    </div>
  )
}

const WEAR_COLOR = (pct) => {
  if (pct >= 50) return 'text-[var(--accent-red)]'
  if (pct >= 25) return 'text-orange-400'
  return 'text-[var(--accent-yellow)]'
}

const WEAR_BAR_COLOR = (pct) => {
  if (pct >= 50) return 'bg-[var(--accent-red)]'
  if (pct >= 25) return 'bg-orange-500'
  return 'bg-[var(--accent-yellow)]'
}

function WearReport({ wear_report }) {
  const entries = Object.entries(wear_report ?? {})
  if (entries.length === 0) return (
    <p className="text-[var(--tag-positive)] text-xs italic">No significant wear this run</p>
  )

  return (
    <ul className="space-y-1.5">
      {entries.map(([slot, pct]) => (
        <li key={slot} className="text-xs">
          <div className="flex justify-between mb-0.5">
            <span className="text-[var(--text-muted)] capitalize">{slot.replace(/_/g, ' ')}</span>
            <span className={`font-bold tabular-nums ${WEAR_COLOR(pct)}`}>{pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-[var(--panel-border)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${WEAR_BAR_COLOR(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function BenchmarkResultCard() {
  const result       = useGameStore(s => s.ignitionResult)
  const clearResult  = useGameStore(s => s.clearIgnitionResult)
  const activeObjId  = useGameStore(s => s.activeObjectiveId)

  if (!result) return null

  const { outcome, benchmark_results, destroyed_slots, tag_label, penalty_tags, isTestFit, wear_report } = result

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]">
        {/* Rank badge — badges01.png: bottom row (y=96, h=48), 2 badges of 136px each
            left=red/fail (x=0), right=blue/success (x=136). Displayed at 2x. */}
        <div className="flex justify-center">
          <div style={{
            width: 272, height: 96,
            backgroundImage: "url('/ui/badges01.png')",
            backgroundPosition: outcome === 'catastrophic_failure' ? '0px -192px' : '-272px -192px',
            backgroundSize: '544px 288px',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
          }} />
        </div>
        {outcome === 'catastrophic_failure' ? (
          <>
            <h2 className="text-[var(--accent-red)] font-bold text-xl tracking-widest uppercase text-center">
              {isTestFit ? 'Predicted: ' : ''}{tag_label}
            </h2>
            {!isTestFit && destroyed_slots?.length > 0 && (
              <div>
                <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Parts Destroyed</p>
                <div className="flex flex-wrap gap-1">
                  {destroyed_slots.map(slot => (
                    <span key={slot} className="bg-[var(--accent-red)]/20 text-[var(--accent-red)] text-xs px-2 py-0.5 rounded">
                      {slot.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-[var(--tag-positive)] font-bold text-xl tracking-widest uppercase text-center">
              {isTestFit ? 'Predicted: Run' : 'Engine Running'}
            </h2>
            {benchmark_results && (
              <div className="grid grid-cols-2 gap-4 py-2">
                <Stat label="Peak HP"     value={benchmark_results.peak_hp}            unit="hp" />
                <Stat label="Torque"      value={benchmark_results.peak_torque}         unit="lb-ft" />
                <Stat label="0–60"        value={benchmark_results.zero_to_sixty}       unit="s" />
                <Stat label="¼ Mile"      value={benchmark_results.quarter_mile}        unit="s" />
                <Stat label="Top Speed"   value={benchmark_results.top_speed}           unit="mph" />
                <Stat label="Reliability" value={benchmark_results.reliability_score}   unit="%" />
              </div>
            )}
            {penalty_tags?.length > 0 && (
              <div>
                <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Active Penalties</p>
                <div className="flex flex-wrap gap-1">
                  {penalty_tags.map(t => (
                    <span key={t.id} className="bg-[var(--tag-penalty)]/20 text-[var(--tag-penalty)] text-xs px-2 py-0.5 rounded">
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!isTestFit && (
              <div>
                <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Post-Run Wear</p>
                <WearReport wear_report={wear_report} />
              </div>
            )}

            {result.objective_met && (
              <p className="text-[var(--tag-positive)] font-bold text-center">OBJECTIVE MET!</p>
            )}
          </>
        )}

        <Button variant="default" onClick={clearResult} className="w-full mt-2">
          Back to Garage
        </Button>
      </Card>
    </div>
  )
}
