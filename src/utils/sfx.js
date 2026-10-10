import sfxCursor       from '../assets/sfx/cursor.mp3'
import sfxSelect       from '../assets/sfx/select.mp3'
import sfxCancel       from '../assets/sfx/cancel.mp3'
import sfxBuy          from '../assets/sfx/buy.mp3'
import sfxError        from '../assets/sfx/error.mp3'
import sfxIgnite       from '../assets/sfx/ignite.mp3'
import sfxPopupOpen    from '../assets/sfx/popup_open.mp3'
import sfxPopupClose   from '../assets/sfx/popup_close.mp3'
import sfxEngineStart  from '../assets/sfx/engine_start.mp3'
import sfxEngineFail   from '../assets/sfx/engine_fail.mp3'
import sfxIgnitionFail from '../assets/sfx/ignition_fail.mp3'
import sfxTurboFail    from '../assets/sfx/turbo_fail.mp3'
import sfxRev          from '../assets/sfx/rev.mp3'
import sfxCrank        from '../assets/sfx/crank.mp3'
import sfxIdle         from '../assets/sfx/idle.mp3'

// Web Audio rather than <audio> elements: once the first tap unlocks the context,
// sounds can play later (after the ignition delay) and loop, which iOS Safari
// blocks for <audio> started outside a tap.

// key → [src, base gain]
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
  ignition_fail: [sfxIgnitionFail, 0.7],
  turbo_fail:    [sfxTurboFail,    0.6],
  rev:           [sfxRev,          0.8],
  crank:         [sfxCrank,        0.7],
  idle:          [sfxIdle,         0.45],
}

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

let ctx = null
let master = null
const buffers = {}   // key → AudioBuffer | Promise
const loops = {}     // key → { source, gain }

function audio() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : volume
  master.connect(ctx.destination)
  for (const key of Object.keys(SOUNDS)) load(key)
  return ctx
}

function load(key) {
  if (buffers[key]) return buffers[key]
  buffers[key] = fetch(SOUNDS[key][0])
    .then(r => r.arrayBuffer())
    .then(data => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
    .then(buf => (buffers[key] = buf))
    .catch(() => (buffers[key] = null))
  return buffers[key]
}

// The first user gesture resumes the context (browsers start it suspended)
function unlock() {
  const ac = audio()
  if (ac?.state === 'suspended') ac.resume()
}
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(ev, unlock, { capture: true, passive: true })
  }
}

async function source(key, { loop = false, offset = 0, gain = 1 } = {}) {
  const ac = audio()
  if (!ac || !SOUNDS[key]) return null
  if (ac.state === 'suspended') ac.resume()
  const buf = await load(key)
  if (!buf) return null
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = loop
  const g = ac.createGain()
  g.gain.value = SOUNDS[key][1] * gain
  src.connect(g).connect(master)
  src.start(0, Math.min(offset, buf.duration - 0.01))
  return { source: src, gain: g }
}

function playSynth({ wave, gain, notes }) {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  for (const [freq, start, length] of notes) {
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.type = wave
    osc.frequency.value = freq
    env.gain.setValueAtTime(gain, now + start)
    env.gain.exponentialRampToValueAtTime(0.0001, now + start + length)
    osc.connect(env).connect(master)
    osc.start(now + start)
    osc.stop(now + start + length + 0.02)
  }
}

// One-shot. offset (seconds) starts partway into the clip.
export function play(key, { offset = 0 } = {}) {
  if (SYNTH[key]) {
    try { playSynth(SYNTH[key]) } catch { /* Web Audio unavailable */ }
    return
  }
  source(key, { offset })
}

// Looping sound (crank, idle) until stopLoop; restarting an active loop is a no-op
export function startLoop(key, { fadeIn = 0.15 } = {}) {
  if (loops[key]) return
  loops[key] = 'starting'
  source(key, { loop: true, gain: fadeIn ? 0 : 1 }).then(node => {
    if (loops[key] !== 'starting') { node?.source.stop(); return } // stopped while loading
    if (!node) { delete loops[key]; return }
    loops[key] = node
    if (fadeIn) {
      const t = ctx.currentTime
      node.gain.gain.setValueAtTime(0, t)
      node.gain.gain.linearRampToValueAtTime(SOUNDS[key][1], t + fadeIn)
    }
  })
}

export function stopLoop(key, { fadeOut = 0.12 } = {}) {
  const node = loops[key]
  delete loops[key]
  if (!node || node === 'starting') return
  const t = ctx.currentTime
  node.gain.gain.setValueAtTime(node.gain.gain.value, t)
  node.gain.gain.linearRampToValueAtTime(0, t + fadeOut)
  node.source.stop(t + fadeOut + 0.02)
}

export function getSoundSettings() {
  return { volume, muted }
}

function applyMaster() {
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02)
  listeners.forEach(fn => fn())
}

export function setVolume(val) {
  volume = Math.max(0, Math.min(1, val))
  writeStored('sfx_volume', volume)
  applyMaster()
}

export function setMuted(val) {
  muted = val
  writeStored('sfx_muted', val)
  applyMaster()
}

export function subscribeSound(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
