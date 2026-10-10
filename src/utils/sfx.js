import sfxCursor       from '../assets/sfx/cursor.ogg'
import sfxSelect       from '../assets/sfx/select.ogg'
import sfxCancel       from '../assets/sfx/cancel.ogg'
import sfxBuy          from '../assets/sfx/buy.ogg'
import sfxError        from '../assets/sfx/error.ogg'
import sfxIgnite       from '../assets/sfx/ignite.ogg'
import sfxPopupOpen    from '../assets/sfx/popup_open.ogg'
import sfxPopupClose   from '../assets/sfx/popup_close.ogg'
import sfxEngineStart  from '../assets/sfx/engine_start.mp3'
import sfxEngineFail   from '../assets/sfx/engine_fail.mp3'
import sfxIgnitionFail from '../assets/sfx/ignition_fail.mp3'
import sfxTurboFail    from '../assets/sfx/turbo_fail.mp3'
import sfxRev          from '../assets/sfx/rev.mp3'

// key → [src, base gain]. Short UI blips may overlap; long clips restart instead.
const SOUNDS = {
  cursor:        [sfxCursor,       0.5],
  select:        [sfxSelect,       0.5],
  cancel:        [sfxCancel,       0.5],
  buy:           [sfxBuy,          0.55],
  error:         [sfxError,        0.5],
  ignite:        [sfxIgnite,       0.6],
  popup_open:    [sfxPopupOpen,    0.4],
  popup_close:   [sfxPopupClose,   0.4],
  car_start:     [sfxEngineStart,  0.7],
  engine_fail:   [sfxEngineFail,   0.6],
  ignition_fail: [sfxIgnitionFail, 0.6],
  turbo_fail:    [sfxTurboFail,    0.6],
  rev:           [sfxRev,          0.8],
}
const OVERLAPPING = new Set(['cursor', 'select', 'cancel', 'buy', 'error', 'popup_open', 'popup_close'])

// Chiptune cues synthesized on the fly: [frequency Hz, start s, length s]
const SYNTH = {
  cash:             { wave: 'square',   gain: 0.12, notes: [[988, 0, 0.07], [1319, 0.07, 0.22]] },
  mission_complete: { wave: 'square',   gain: 0.1,  notes: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.45]] },
  install:          { wave: 'triangle', gain: 0.25, notes: [[196, 0, 0.05], [147, 0.05, 0.09]] },
}

function readStored(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, String(value)) } catch { /* storage blocked */ }
}

let volume = Number(readStored('sfx_volume', 0.8))
let muted  = readStored('sfx_muted', 'false') === 'true'
const listeners = new Set()

const pool = Object.fromEntries(
  Object.entries(SOUNDS).map(([key, [src]]) => [key, new Audio(src)])
)

let audioCtx = null
function playSynth({ wave, gain, notes }) {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
  const now = audioCtx.currentTime
  for (const [freq, start, length] of notes) {
    const osc = audioCtx.createOscillator()
    const env = audioCtx.createGain()
    osc.type = wave
    osc.frequency.value = freq
    env.gain.setValueAtTime(gain * volume, now + start)
    env.gain.exponentialRampToValueAtTime(0.0001, now + start + length)
    osc.connect(env).connect(audioCtx.destination)
    osc.start(now + start)
    osc.stop(now + start + length + 0.02)
  }
}

export function play(key) {
  if (muted || volume === 0) return
  if (SYNTH[key]) {
    try { playSynth(SYNTH[key]) } catch { /* Web Audio unavailable */ }
    return
  }
  const base = pool[key]
  if (!base) return
  const audio = OVERLAPPING.has(key) ? base.cloneNode() : base
  audio.volume = Math.min(1, SOUNDS[key][1] * volume)
  audio.currentTime = 0
  audio.play().catch(() => {})
}

export function getSoundSettings() {
  return { volume, muted }
}

export function setVolume(val) {
  volume = Math.max(0, Math.min(1, val))
  writeStored('sfx_volume', volume)
  listeners.forEach(fn => fn())
}

export function setMuted(val) {
  muted = val
  writeStored('sfx_muted', val)
  listeners.forEach(fn => fn())
}

export function subscribeSound(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
