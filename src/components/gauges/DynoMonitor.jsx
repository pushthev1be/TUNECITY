import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/useGameStore.js'
import { buildPhases } from '../ignition/IgnitionSequence.jsx'

// The dyno computer's screen. Everything that used to pop up over the car and dim
// it — the start-up log, the run's numbers, what broke — prints here instead, so
// the car stays in plain view while it tries to start, runs, or fails.

const NO_START = new Set(['wont_turn_over', 'no_spark', 'no_compression', 'fuel_starved'])
const SLOT_NAME = s => s.replace(/_/g, ' ')
const G = '#7CFFB2', AMBER = '#ffb020', RED = '#ff4d4d', DIM = '#3f6f55'

function Line({ children, color = G, dim = false }) {
  return <p className="leading-snug" style={{ color: dim ? DIM : color }}>{children}</p>
}

function Big({ label, value, unit, color = G }) {
  return (
    <div className="text-center">
      <p className="text-[9px] tracking-widest" style={{ color: DIM }}>{label}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color }}>{value ?? '—'}<span className="text-[9px] ml-0.5" style={{ color: DIM }}>{unit}</span></p>
    </div>
  )
}

// The power and torque curves from the run, drawn left to right while it revs
function DynoGraph({ curve, progress }) {
  if (!curve?.length) return null
  const W = 220, H = 70, pad = 4
  const maxHp = Math.max(...curve.map(p => p.hp), 1), maxTq = Math.max(...curve.map(p => p.torque), 1)
  const top = Math.max(maxHp, maxTq) * 1.1
  const x = i => pad + (i / (curve.length - 1)) * (W - pad * 2)
  const y = v => H - pad - (v / top) * (H - pad * 2)
  const path = key => curve.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const len = 600
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 70 }}>
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1={pad} x2={W - pad} y1={H * f} y2={H * f} stroke={DIM} strokeWidth="0.4" strokeDasharray="2 3" />)}
      <path d={path('torque')} fill="none" stroke={AMBER} strokeWidth="1.6" strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
      <path d={path('hp')} fill="none" stroke={G} strokeWidth="1.8" strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
      <text x={W - pad} y={10} textAnchor="end" fontSize="7" fill={G}>HP</text>
      <text x={W - pad} y={19} textAnchor="end" fontSize="7" fill={AMBER}>TQ</text>
    </svg>
  )
}

export function DynoMonitor() {
  const ignitionState = useGameStore(s => s.ignitionState)
  const result        = useGameStore(s => s.ignitionResult)
  const running       = useGameStore(s => s.engineRunning)
  const revCount      = useGameStore(s => s.revCount)
  const prediction    = useGameStore(s => s.computed?.prediction)
  const issues        = useGameStore(s => s.computed?.issues ?? [])
  const activeCar     = useGameStore(s => s.activeCar)
  const damage        = useGameStore(s => s.damageByCar?.[s.activeCar])

  // start-up log: one line every 500 ms while cranking
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (ignitionState !== 'animating') { setShown(0); return }
    const id = setInterval(() => setShown(n => n + 1), 500)
    return () => clearInterval(id)
  }, [ignitionState])

  // a rev: sweep the RPM up to redline and draw the curve, then fall back to idle
  const [rev, setRev] = useState(null)
  useEffect(() => {
    if (!revCount || !running) return
    const t0 = performance.now(); let raf
    const step = now => {
      const p = Math.min(1, (now - t0) / 2400)
      setRev(p); if (p < 1) raf = requestAnimationFrame(step); else setTimeout(() => setRev(null), 1200)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [revCount, running])
  useEffect(() => { setRev(null) }, [activeCar])

  const bench = result?.benchmark_results
  const failed = result?.outcome === 'catastrophic_failure'
  const noStart = failed && NO_START.has(result.tag)
  let status, statusColor, body

  if (ignitionState === 'animating') {
    status = 'CRANKING'; statusColor = AMBER
    const phases = buildPhases(prediction?.state ?? 'stable')
    body = phases.slice(0, Math.min(shown + 1, phases.length)).map((p, i, a) =>
      <Line key={i} dim={i < a.length - 1}>{'> '}{p.label}</Line>)
  } else if (result?.noPower) {
    status = 'NO POWER'; statusColor = RED
    body = <>
      <Line color={RED}>{'> '}Key turned. Nothing.</Line>
      <Line color={AMBER}>{'> '}No battery or dead electrics: the starter has no power.</Line>
      <Line dim>{'> '}Fit a battery (and an ignition coil) to crank it.</Line>
    </>
  } else if (failed && !result.isTestFit) {
    status = noStart ? 'NO START' : 'ENGINE FAILURE'; statusColor = noStart ? AMBER : RED
    const issue = issues.find(i => i.label === result.tag_label)
    body = <>
      <Line color={statusColor}>{'> '}{result.tag_label}</Line>
      {issue?.text && <Line dim>{'> '}{issue.text}</Line>}
      {result.destroyed_slots?.length > 0 && <Line color={RED}>{'> '}Destroyed: {result.destroyed_slots.map(SLOT_NAME).join(', ')}</Line>}
      {damage?.slots?.length > 0 && <Line color={AMBER}>{'> '}Smoking until replaced: {damage.slots.map(SLOT_NAME).join(', ')}</Line>}
    </>
  } else if (damage?.slots?.length) {
    status = 'DAMAGED'; statusColor = RED
    body = <>
      <Line color={RED}>{'> '}{damage.label} — engine bay still smoking</Line>
      <Line color={AMBER}>{'> '}Replace: {damage.slots.map(SLOT_NAME).join(', ')}</Line>
    </>
  } else if (bench && (running || result?.isTestFit)) {
    status = result.isTestFit ? 'TEST FIT' : rev != null ? 'DYNO RUN' : 'RUNNING'; statusColor = result.isTestFit ? AMBER : G
    const rpm = rev != null ? Math.round(900 + rev * 6600) : running ? 850 : 0
    body = <>
      <div className="flex items-baseline justify-between">
        <Line>{result.isTestFit ? '> Predicted run (no risk)' : '> Engine running'}</Line>
        {!result.isTestFit && <span className="font-bold tabular-nums" style={{ color: rev != null ? AMBER : G }}>{rpm.toLocaleString()} rpm</span>}
      </div>
      <div className="grid grid-cols-3 gap-y-1.5 mt-1.5">
        <Big label="POWER" value={bench.peak_hp} unit="hp" />
        <Big label="TORQUE" value={bench.peak_torque} unit="lb-ft" />
        <Big label="TOP" value={bench.top_speed} unit="mph" />
        <Big label="0-60" value={bench.zero_to_sixty?.toFixed(2)} unit="s" />
        <Big label="1/4 MI" value={bench.quarter_mile?.toFixed(2)} unit="s" />
        <Big label="RELIAB" value={bench.reliability_score} unit="%" color={bench.reliability_score < 60 ? AMBER : G} />
      </div>
      <div className="mt-1"><DynoGraph curve={bench.dyno_curve} progress={rev ?? 1} /></div>
      {!result.isTestFit && rev == null && <Line dim>{'> '}Press REV to run it on the dyno</Line>}
      {Object.keys(result.wear_report ?? {}).length > 0 && (
        <Line color={AMBER}>{'> '}Wear: {Object.entries(result.wear_report).map(([k, v]) => `${SLOT_NAME(k)} ${v}%`).join(' · ')}</Line>
      )}
    </>
  } else {
    status = 'READY'; statusColor = DIM
    body = <>
      <Line>{'> '}Engine off. Turn the key with IGNITE.</Line>
      {prediction && <Line color={prediction.color}>{'> '}Prediction: {prediction.label} ({Math.round((prediction.confidence ?? 0) * 100)}%)</Line>}
      <Line dim>{'> '}TEST FIT runs the numbers without risking parts.</Line>
    </>
  }

  return (
    <section className="rounded-lg border-2 border-[#1d2a22] bg-[#040806] overflow-hidden shadow-[inset_0_0_24px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#0b130e] border-b border-[#1d2a22]">
        <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: DIM }}>DYNO MONITOR</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest" style={{ color: statusColor }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
          {status}
        </span>
      </div>
      <div className="relative px-2.5 py-2 font-mono text-[11px] min-h-[132px]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(124,255,178,0.035) 0 1px, transparent 1px 3px)' }}>
        {body}
      </div>
    </section>
  )
}
