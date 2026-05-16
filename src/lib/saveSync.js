import { supabase } from './supabase.js'

export async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.session
}

export async function loadRemoteSave() {
  const { data, error } = await supabase
    .from('game_saves')
    .select('save')
    .single()
  if (error || !data) return null
  return data.save
}

export async function upsertRemoteSave(save) {
  const { error } = await supabase
    .from('game_saves')
    .upsert({ save, saved_at: new Date().toISOString() })
  if (error) console.warn('[saveSync] upsert failed:', error.message)
}
