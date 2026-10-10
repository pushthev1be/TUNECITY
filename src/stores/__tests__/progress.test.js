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

describe('trade-in upgrades', () => {
  beforeEach(() => useGameStore.setState(initial, true))

  it('trades the installed part toward the new one and installs it', () => {
    const store = useGameStore.getState()
    store.addPart('engine_k20_built')
    store.installPart('engine', 'engine_k20_built') // $4,500, B18 goes back to inventory
    const cash = useGameStore.getState().currency
    const b18Spares = useGameStore.getState().ownedParts.engine_b18_stock

    const tradeIn = useGameStore.getState().getTradeIn('engine_ls3')
    expect(tradeIn.part.id).toBe('engine_k20_built')
    expect(tradeIn.credit).toBe(Math.floor(4500 * 0.9))

    expect(useGameStore.getState().upgradePart('engine_ls3')).toBe(true)
    const state = useGameStore.getState()
    expect(state.installedParts.engine.id).toBe('engine_ls3')
    expect(state.currency).toBe(cash - (12000 - tradeIn.credit))
    expect(state.ownedParts.engine_k20_built).toBe(0)
    expect(state.ownedParts.engine_b18_stock).toBe(b18Spares)
  })

  it('never gives change when the trade-in is worth more than the new part', () => {
    const store = useGameStore.getState()
    store.addPart('engine_ls3')
    store.installPart('engine', 'engine_ls3')
    const cash = useGameStore.getState().currency
    expect(useGameStore.getState().getTradeIn('engine_k20_built').credit).toBe(4500)
    useGameStore.getState().upgradePart('engine_k20_built')
    expect(useGameStore.getState().currency).toBe(cash)
  })
})
