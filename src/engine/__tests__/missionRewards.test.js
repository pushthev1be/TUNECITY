import { describe, it, expect } from 'vitest'
import { checkObjective } from '../economy/missionRewards.js'
import objectivesData from '../../data/objectives.json'

const sleeper = objectivesData.find(o => o.id === 'civic_sleeper')
const passingStats = { hp: 520, reliability: 70, zero_to_sixty: 3.8, total_parts_cost: 20000 }
const sleeperTag = { id: 'sleeper', category: 'bonus' }

describe('checkObjective — constraints', () => {
  it('passes when targets and constraints are met', () => {
    expect(checkObjective({}, passingStats, sleeper, [sleeperTag])).toBe(true)
  })

  it('fails when over budget', () => {
    const stats = { ...passingStats, total_parts_cost: sleeper.constraints.find(c => c.type === 'budget').max + 1 }
    expect(checkObjective({}, stats, sleeper, [sleeperTag])).toBe(false)
  })

  it('fails when a required tag is missing', () => {
    expect(checkObjective({}, passingStats, sleeper, [])).toBe(false)
  })

  it('fails when a catastrophic tag is active', () => {
    const tags = [sleeperTag, { id: 'grenaded', category: 'catastrophic' }]
    expect(checkObjective({}, passingStats, sleeper, tags)).toBe(false)
  })
})
