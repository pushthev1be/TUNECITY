import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../useGameStore.js'

const initial = useGameStore.getState()

describe('setActiveObjective', () => {
  beforeEach(() => useGameStore.setState(initial, true))

  it('adds the mission car for saves that finished the campaign before it was extended', () => {
    useGameStore.setState({ completedObjectives: ['get_her_running', 'civic_sleeper', 'street_king', 'track_terror', 'garage_queen'] })
    useGameStore.getState().setActiveObjective('camry_commuter')

    const state = useGameStore.getState()
    expect(state.activeObjectiveId).toBe('camry_commuter')
    expect(state.ownedCars.map(c => c.car_id)).toContain('toyota_camry')
    expect(state.activeCar).toBe('toyota_camry')
    expect(state.installedParts.engine).not.toBeNull()
  })

  it('ignores locked missions', () => {
    useGameStore.getState().setActiveObjective('hellcat_demon')
    expect(useGameStore.getState().activeObjectiveId).toBe('get_her_running')
  })
})

describe('Black Market parts', () => {
  beforeEach(() => useGameStore.setState(initial, true))

  it('can be installed, returning the replaced part to inventory', () => {
    const store = useGameStore.getState()
    const before = store.installedParts.engine.id
    store.addPart('engine_billet_v8_twin_turbo')
    store.installPart('engine', 'engine_billet_v8_twin_turbo')

    const state = useGameStore.getState()
    expect(state.installedParts.engine.id).toBe('engine_billet_v8_twin_turbo')
    expect(state.ownedParts.engine_billet_v8_twin_turbo).toBe(0)
    expect(state.ownedParts[before]).toBeGreaterThan(0)
  })

  it('does not duplicate the slotted part when the install is rejected', () => {
    const store = useGameStore.getState()
    const slotted = store.installedParts.engine.id
    const owned = store.ownedParts[slotted] ?? 0
    store.installPart('engine', 'engine_billet_v8_twin_turbo') // not owned

    const state = useGameStore.getState()
    expect(state.installedParts.engine.id).toBe(slotted)
    expect(state.ownedParts[slotted] ?? 0).toBe(owned)
  })

  it('can be sold', () => {
    const store = useGameStore.getState()
    store.addPart('turbo_stage4_race')
    const cash = useGameStore.getState().currency
    store.sellPart('turbo_stage4_race')
    expect(useGameStore.getState().currency).toBe(cash + Math.floor(42000 * 0.75))
  })
})
