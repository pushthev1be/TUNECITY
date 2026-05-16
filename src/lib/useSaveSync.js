import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/useGameStore.js'
import { ensureSession, loadRemoteSave, upsertRemoteSave } from './saveSync.js'

// Fields we persist to Supabase — same set as the Zustand partialize
function extractSave(state) {
  return {
    currency:            state.currency,
    ownedParts:          state.ownedParts,
    ownedCars:           state.ownedCars,
    activeCar:           state.activeCar,
    installedParts:      state.installedParts,
    installedPartsByCar: state.installedPartsByCar,
    completedObjectives: state.completedObjectives,
    activeObjectiveId:   state.activeObjectiveId,
    bmUnlocked:          state.bmUnlocked,
    bmListings:          state.bmListings,
  }
}

export function useSaveSync() {
  const hydrated   = useRef(false)
  const saveTimer  = useRef(null)
  const syncActive = useRef(false)

  // ── On mount: sign in + load remote save ─────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        await ensureSession()
        const remote = await loadRemoteSave()
        if (remote) {
          useGameStore.setState(remote)
        }
      } catch (err) {
        // Anonymous auth not yet enabled — silently fall back to localStorage
        console.warn('[saveSync] remote load skipped:', err.message)
      } finally {
        hydrated.current   = true
        syncActive.current = true
      }
    }
    init()
  }, [])

  // ── Subscribe to store changes + debounce upsert ─────────────────────────
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      if (!syncActive.current) return
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        upsertRemoteSave(extractSave(state))
      }, 2000)  // 2s debounce — saves 2 seconds after last change
    })
    return () => {
      unsub()
      clearTimeout(saveTimer.current)
    }
  }, [])
}
