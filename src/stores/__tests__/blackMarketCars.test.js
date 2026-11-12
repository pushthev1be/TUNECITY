import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../useGameStore.js'
import { BM_CARS } from '../blackMarketSlice.js'

const initial = useGameStore.getState()

describe('Black Market cars', () => {
  beforeEach(() => useGameStore.setState(initial, true))

  it('sells exactly the three mystery cars, none of which a mission gives you', () => {
    expect(BM_CARS.map(c => c.id).sort()).toEqual(['mystery_0e', 'mystery_88', 'mystery_ae'])
  })

  it('cannot be bought before the Black Market opens', () => {
    useGameStore.setState({ currency: 1_000_000 })
    expect(useGameStore.getState().buyBMCar('mystery_88')).toBe(false)
    expect(useGameStore.getState().ownedCars.map(c => c.car_id)).not.toContain('mystery_88')
  })

  it('needs the cash', () => {
    useGameStore.setState({ bmUnlocked: true, currency: 39_999 })
    expect(useGameStore.getState().buyBMCar('mystery_88')).toBe(false)
    expect(useGameStore.getState().currency).toBe(39_999)
  })

  it('takes the price, adds the car with its factory parts, and only sells it once', () => {
    useGameStore.setState({ bmUnlocked: true, currency: 100_000 })
    expect(useGameStore.getState().buyBMCar('mystery_88')).toBe(true)

    const s = useGameStore.getState()
    expect(s.currency).toBe(60_000)
    expect(s.ownedCars.map(c => c.car_id)).toContain('mystery_88')
    expect(s.installedPartsByCar.mystery_88.engine).not.toBeNull()

    expect(useGameStore.getState().buyBMCar('mystery_88')).toBe(false)
    expect(useGameStore.getState().currency).toBe(60_000)
  })
})
