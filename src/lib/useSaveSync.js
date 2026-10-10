import { useEffect, useRef } from 'react'
import { useGameStore, pickSaveFields } from '../stores/useGameStore.js'
import { ensureSession, loadRemoteSave, upsertRemoteSave } from './saveSync.js'

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
          useGameStore.setState(pickSaveFields(remote))
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
        upsertRemoteSave(pickSaveFields(state))
      }, 2000)  // 2s debounce — saves 2 seconds after last change
    })
    return () => {
      unsub()
      clearTimeout(saveTimer.current)
    }
  }, [])
}
