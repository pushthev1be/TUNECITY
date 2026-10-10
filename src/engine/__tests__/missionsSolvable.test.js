import { describe, it, expect } from 'vitest'
import { computeStats } from '../diagnostic/computeStats.js'
import { evaluateTags } from '../diagnostic/evaluateTags.js'
import { resolveIgnition } from '../ignition/resolveIgnition.js'
import carsData from '../../data/cars.json'
import partsData from '../../data/parts.json'
import objectivesData from '../../data/objectives.json'

// Guards the campaign against balance changes that make a mission impossible:
// a seeded local search over shop parts must find a build that passes each one.

const SLOTS = [...new Set(partsData.map(p => p.category))]
const OPTIONS = Object.fromEntries(SLOTS.map(s => [s, [null, ...partsData.filter(p => p.category === s)]]))

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function evaluate(car, installed, objective) {
  const build = { car_id: car.id, installed_parts: installed }
  const { activeTags, stats } = evaluateTags(build, car, computeStats(build, car))
  return { result: resolveIgnition({ ...build, computed: { stats, activeTags } }, car, objective), stats, activeTags }
}

// Higher is better; >= 0 means every target and constraint has headroom.
function score(car, installed, objective) {
  const { result, stats, activeTags } = evaluate(car, installed, objective)
  if (result.outcome !== 'success') return -10 * activeTags.filter(t => t.category === 'catastrophic').length
  const actual = { ...stats, ...result.benchmark_results }
  const margins = objective.targets.map(t =>
    (t.op === 'gte' ? actual[t.stat] - t.value : t.value - actual[t.stat]) / Math.abs(t.value)
  )
  for (const c of objective.constraints) {
    if (c.type === 'budget') margins.push((c.max - stats.total_parts_cost) / c.max)
    if (c.type === 'required_tag') margins.push(activeTags.some(t => t.id === c.tag) ? 1 : tagGap(c.tag, stats, installed))
  }
  const misses = margins.filter(m => m < 0)
  return misses.length ? misses.reduce((a, b) => a + b, 0) : Math.min(...margins)
}

// Gradient toward a missing required tag so the search can climb to it
function tagGap(tag, stats, installed) {
  if (tag === 'sleeper') return (stats.hp - 500) / 500 - 0.01
  if (tag === 'balanced') return 0.14 - Math.abs(stats.hp / 800 - stats.grip)
  if (tag === 'track_prepped') {
    const have = [(installed.suspension?.tier ?? 0) >= 3, (installed.tires?.tier ?? 0) >= 2, (installed.weight_reduction?.stats.weight ?? 0) < 0]
    return -0.2 * have.filter(x => !x).length
  }
  return -0.5
}

function descend(car, objective, installed) {
  let best = score(car, installed, objective)
  let improved = true
  while (improved) {
    improved = false
    for (const slot of SLOTS) {
      for (const part of OPTIONS[slot]) {
        const next = { ...installed, [slot]: part }
        const s = score(car, next, objective)
        if (s > best + 1e-9) { installed = next; best = s; improved = true }
      }
    }
  }
  return { installed, score: best }
}

function solve(objective, rand) {
  const car = carsData.find(c => c.id === objective.car_id)
  const pick = arr => arr[Math.floor(rand() * arr.length)]
  let best = null
  for (let restart = 0; restart < 4 && !(best?.score >= 0); restart++) {
    let cur = descend(car, objective, Object.fromEntries(SLOTS.map(s => [s, pick(OPTIONS[s])])))
    for (let kick = 0; kick < 40 && cur.score < 0; kick++) {
      const perturbed = { ...cur.installed }
      for (let n = 0; n < 3; n++) { const s = pick(SLOTS); perturbed[s] = pick(OPTIONS[s]) }
      const cand = descend(car, objective, perturbed)
      if (cand.score >= cur.score) cur = cand
    }
    if (!best || cur.score > best.score) best = cur
  }
  return { car, ...best }
}

describe('every mission is beatable with shop parts', () => {
  for (const objective of objectivesData) {
    it(objective.id, () => {
      const { car, installed } = solve(objective, mulberry32(1234))
      expect(evaluate(car, installed, objective).result.objective_met).toBe(true)
    })
  }
})
