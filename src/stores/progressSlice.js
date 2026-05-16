import objectivesData from '../data/objectives.json'

export function createProgressSlice(set, get) {
  return {
    completedObjectives: [],
    activeObjectiveId: 'get_her_running',

    getActiveObjective() {
      const { activeObjectiveId } = get()
      return objectivesData.find(o => o.id === activeObjectiveId) ?? null
    },

    setActiveObjective(objectiveId) {
      const objective = objectivesData.find(o => o.id === objectiveId)
      if (!objective) return
      
      // Auto-switch to the car required by this objective if it's different
      const { activeCar, setActiveCar } = get()
      if (objective.car_id && objective.car_id !== activeCar) {
        setActiveCar(objective.car_id)
      }

      set({ activeObjectiveId: objectiveId })
    },

    autoSelectObjectiveForCar(carId) {
      const { isObjectiveUnlocked, completedObjectives, activeObjectiveId } = get()
      
      const currentObj = objectivesData.find(o => o.id === activeObjectiveId)
      if (currentObj && currentObj.car_id === carId) return

      const carObjs = objectivesData.filter(o => o.car_id === carId)
      const unlocked = carObjs.filter(o => isObjectiveUnlocked(o.id) && !completedObjectives.includes(o.id))
      
      if (unlocked.length > 0) {
        set({ activeObjectiveId: unlocked[0].id })
      } else {
        const completed = carObjs.filter(o => completedObjectives.includes(o.id))
        if (completed.length > 0) {
          set({ activeObjectiveId: completed[completed.length - 1].id })
        } else {
          set({ activeObjectiveId: null })
        }
      }
    },

    completeObjective(objectiveId) {
      const { completedObjectives } = get()
      if (completedObjectives.includes(objectiveId)) return

      const objective = objectivesData.find(o => o.id === objectiveId)
      if (!objective) return

      // Grant currency and parts rewards
      get().addCurrency(objective.rewards.currency ?? 0)
      for (const partId of (objective.rewards.parts ?? [])) {
        get().addPart(partId)
      }

      const newCompleted = [...completedObjectives, objectiveId]
      set({
        completedObjectives: newCompleted,
        activeObjectiveId: objective.rewards.unlocks_mission ?? null,
      })

      // Unlock Black Market after completing the second mission
      if (newCompleted.length >= 2) {
        get().unlockBlackMarket?.()
      }

      // Add the next mission's required car to the garage so the player can build it,
      // and switch to it so it appears in the bay immediately after the reward card.
      const nextObjId = objective.rewards.unlocks_mission
      if (nextObjId) {
        const nextObj = objectivesData.find(o => o.id === nextObjId)
        if (nextObj?.car_id && nextObj.car_id !== get().activeCar) {
          get().addCar(nextObj.car_id)
          get().setActiveCar(nextObj.car_id)
        }
      }
    },

    isObjectiveUnlocked(objectiveId) {
      const { completedObjectives } = get()
      if (objectiveId === 'get_her_running') return true
      return objectivesData.some(
        o => o.rewards.unlocks_mission === objectiveId && completedObjectives.includes(o.id)
      )
    },
  }
}
