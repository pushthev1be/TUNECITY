import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createInventorySlice } from './inventorySlice.js'
import { createBuildSlice } from './buildSlice.js'
import { createProgressSlice } from './progressSlice.js'
import { createUiSlice } from './uiSlice.js'
import { createBlackMarketSlice } from './blackMarketSlice.js'

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
      migrate: () => ({}),
      partialize: (state) => ({
        currency: state.currency,
        ownedParts: state.ownedParts,
        ownedCars: state.ownedCars,
        activeCar: state.activeCar,
        installedParts: state.installedParts,
        installedPartsByCar: state.installedPartsByCar,
        completedObjectives: state.completedObjectives,
        activeObjectiveId: state.activeObjectiveId,
        bmUnlocked: state.bmUnlocked,
        bmListings: state.bmListings,
      }),
    }
  )
)
