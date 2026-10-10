import { useEffect, useRef } from 'react'
import { useGameStore, pickSaveFields, SAVE_FIELDS } from '../stores/useGameStore.js'
import { ensureSession, loadRemoteSave, upsertRemoteSave } from './saveSync.js'

const SAVED_AT_KEY = 'tunecity-saved-at'

function readLocalSavedAt() {
  try {
    return Number(localStorage.getItem(SAVED_AT_KEY)) || 0
  } catch {
    return 0
  }
}

function writeLocalSavedAt(savedAt) {
  try {
    localStorage.setItem(SAVED_AT_KEY, String(savedAt))
  } catch {
    // Storage unavailable — remote save still carries its own timestamp
  }
}

function saveFieldsChanged(state, prev) {
  return SAVE_FIELDS.some(k => state[k] !== prev[k])
}

export function useSaveSync() {
  const saveTimer  = useRef(null)
  const syncActive = useRef(false)

  // ── On mount: sign in + reconcile local and remote saves ─────────────────
  useEffect(() => {
    async function init() {
      try {
        await ensureSession()
        const remote = await loadRemoteSave()
        const localSavedAt = readLocalSavedAt()
        // Remote wins only when it is strictly newer than the last local change
        if (remote && remote.savedAt > localSavedAt) {
          useGameStore.setState(pickSaveFields(remote.save))
          writeLocalSavedAt(remote.savedAt)
        } else if (localSavedAt) {
          // Local progress is newer (e.g. played offline) — push it up
          upsertRemoteSave(pickSaveFields(useGameStore.getState()), localSavedAt)
        }
      } catch (err) {
        // Anonymous auth not yet enabled — silently fall back to localStorage
        console.warn('[saveSync] remote load skipped:', err.message)
      } finally {
        syncActive.current = true
      }
    }
    init()
  }, [])

  // ── Stamp local changes + debounce upsert ────────────────────────────────
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      if (!saveFieldsChanged(state, prev)) return
      const savedAt = Date.now()
      writeLocalSavedAt(savedAt)
      if (!syncActive.current) return
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        upsertRemoteSave(pickSaveFields(useGameStore.getState()), savedAt)
      }, 2000)  // 2s debounce — saves 2 seconds after last change
    })
    return () => {
      unsub()
      clearTimeout(saveTimer.current)
    }
  }, [])
}
