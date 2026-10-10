import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createInventorySlice } from './inventorySlice.js'
import { createBuildSlice } from './buildSlice.js'
import { createProgressSlice } from './progressSlice.js'
import { createUiSlice } from './uiSlice.js'
import { createBlackMarketSlice } from './blackMarketSlice.js'

export const SAVE_FIELDS = [
  'currency',
  'ownedParts',
  'ownedCars',
  'activeCar',
  'installedParts',
  'installedPartsByCar',
  'completedObjectives',
  'activeObjectiveId',
  'bmUnlocked',
  'bmListings',
]

export function pickSaveFields(state) {
  return Object.fromEntries(SAVE_FIELDS.filter(k => k in state).map(k => [k, state[k]]))
}

export const useGameStore = create(
  persist(
    (...args) => ({
      ...createInventorySlice(...args),
      ...createBuildSlice(...args),
      ...createProgressSlice(...args),
      ...createUiSlice(...args),
      ...createBlackMarketSlice(...args),
    }),
    {
      name: 'tunecity-save',
      version: 3,
      // Keep known fields from older saves; anything missing falls back to slice defaults.
      migrate: (persisted) => pickSaveFields(persisted ?? {}),
      partialize: pickSaveFields,
    }
  )
)
