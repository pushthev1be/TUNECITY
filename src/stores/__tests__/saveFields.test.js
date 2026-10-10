import { describe, it, expect } from 'vitest'
import { pickSaveFields } from '../useGameStore.js'

describe('pickSaveFields', () => {
  it('keeps known save fields and drops everything else', () => {
    const saved = pickSaveFields({ currency: 5000, completedObjectives: ['get_her_running'], ignitionState: 'idle' })
    expect(saved).toEqual({ currency: 5000, completedObjectives: ['get_her_running'] })
  })
})
