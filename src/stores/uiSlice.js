export function createUiSlice(set, get) {
  return {
    screen: 'garage',          // 'garage' | 'shop' | 'missions'
    shopOpen: false,
    ignitionState: 'idle',     // 'idle' | 'animating' | 'result'
    ignitionResult: null,      // last resolveIgnition() return value
    missionCompleteData: null, // set when a mission is completed
    engineRunning: false,      // true after a successful ignition (until next ignite attempt)

    setScreen(screen) {
      set({ screen })
    },

    setShopOpen(open) {
      set({ shopOpen: open })
    },

    startIgnitionAnimation() {
      set({ ignitionState: 'animating', ignitionResult: null, engineRunning: false })
    },

    setIgnitionResult(result) {
      const ran = result?.outcome !== 'catastrophic_failure' && result?.outcome != null
      set({ ignitionState: 'result', ignitionResult: result, engineRunning: ran })
    },

    clearIgnitionResult() {
      set({ ignitionState: 'idle', ignitionResult: null })
    },

    showMissionComplete(data) {
      set({ missionCompleteData: data })
    },

    clearMissionComplete() {
      set({ missionCompleteData: null })
    },
  }
}
