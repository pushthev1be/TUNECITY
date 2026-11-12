export function createUiSlice(set, get) {
  return {
    screen: 'garage',          // 'garage' | 'shop' | 'missions'
    shopOpen: false,
    ignitionState: 'idle',     // 'idle' | 'animating' (the result shows on the dyno monitor)
    ignitionResult: null,      // last resolveIgnition() return value
    missionCompleteData: null, // set when a mission is completed
    engineRunning: false,      // true after a successful ignition (until next ignite attempt)
    revCount: 0,               // bumped by each rev; the dyno runs the wheels for each one

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
      set({ ignitionState: 'idle', ignitionResult: result, engineRunning: ran })
    },

    rev() {
      set(s => ({ revCount: s.revCount + 1 }))
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
