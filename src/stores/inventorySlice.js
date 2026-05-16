import partsData from '../data/parts.json'
import carsData  from '../data/cars.json'

const STARTING_STATE = {
  currency: 100000,
  ownedParts: {
    battery_basic:        3,
    battery_basic_used:   2,
    spark_plugs_stock:    3,
    spark_plugs_used:     2,
    ignition_coil_stock:  3,
    ignition_coil_used:   1,
    head_gasket_stock:    3,
    head_gasket_used:     2,
    fuel_pump_stock:      2,
    fuel_pump_used:       1,
    engine_b18_stock:     1,
    intake_stock_airbox:  2,
    exhaust_stock:        2,
    trans_5spd_stock:     1,
    trans_stock_auto:     1,
    tires_street_basic:   3,
    wheels_steel_15:      2,
    diff_stock:           1,
    cooling_stock:        2,
    ecu_stock:            2,
    suspension_stock:     2,
    pistons_stock:        2,
    brakes_stock:         2,
  },
  ownedCars: [{ car_id: 'civic_eg_92_project', nickname: null }],
}

export function createInventorySlice(set, get) {
  return {
    ...STARTING_STATE,

    buyPart(partId) {
      const part = partsData.find(p => p.id === partId)
      if (!part) return
      const { currency, ownedParts } = get()
      if (currency < part.cost) return
      set({
        currency: currency - part.cost,
        ownedParts: { ...ownedParts, [partId]: (ownedParts[partId] ?? 0) + 1 },
      })
    },

    addPart(partId, qty = 1) {
      const { ownedParts } = get()
      set({ ownedParts: { ...ownedParts, [partId]: (ownedParts[partId] ?? 0) + qty } })
    },

    removePart(partId, qty = 1) {
      const { ownedParts } = get()
      const current = ownedParts[partId] ?? 0
      const next = Math.max(0, current - qty)
      set({ ownedParts: { ...ownedParts, [partId]: next } })
    },

    sellPart(partId) {
      const part = partsData.find(p => p.id === partId)
      if (!part) return
      const { ownedParts } = get()
      if ((ownedParts[partId] ?? 0) < 1) return
      const salePrice = Math.floor(part.cost * 0.75)
      set({
        currency: get().currency + salePrice,
        ownedParts: { ...ownedParts, [partId]: (ownedParts[partId] ?? 0) - 1 },
      })
    },

    scrapPart(partId) {
      const part = partsData.find(p => p.id === partId)
      if (!part) return
      const { ownedParts } = get()
      if ((ownedParts[partId] ?? 0) < 1) return
      const scrapValue = part.scrap_value ?? Math.floor(part.cost * 0.18)
      set({
        currency: get().currency + scrapValue,
        ownedParts: { ...ownedParts, [partId]: (ownedParts[partId] ?? 0) - 1 },
      })
    },

    addCurrency(amount) {
      set({ currency: get().currency + amount })
    },

    addCar(carId, nickname = null) {
      const { ownedCars } = get()
      if (!ownedCars.find(c => c.car_id === carId)) {
        set({ ownedCars: [...ownedCars, { car_id: carId, nickname }] })
        get().initCarBuild?.(carId)
      }
    },

    partCount(partId) {
      return get().ownedParts[partId] ?? 0
    },
  }
}
