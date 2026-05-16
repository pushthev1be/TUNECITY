function supportsAiff() {
  try {
    return new Audio().canPlayType('audio/x-aiff') !== ''
  } catch { return false }
}

const SOUNDS = {
  cursor:        '/sfx/cursor.ogg',
  select:        '/sfx/select.ogg',
  cancel:        '/sfx/cancel.ogg',
  buy:           '/sfx/buy.ogg',
  error:         '/sfx/error.ogg',
  ignite:        '/sfx/ignite.ogg',
  popup_open:    '/sfx/popup_open.ogg',
  popup_close:   '/sfx/popup_close.ogg',
  // Car engine sounds
  car_start:     '/sfx/engine_start.mp3',
  engine_fail:   '/sfx/engine_fail.mp3',
  ignition_fail: '/sfx/ignition_fail.mp3',
  turbo_fail:    '/sfx/turbo_fail.mp3',
  rev:           supportsAiff() ? '/sfx/rev.aiff' : '/sfx/engine_start.mp3',
}

let muted = localStorage.getItem('sfx_muted') === 'true'

const pool = Object.fromEntries(
  Object.entries(SOUNDS).map(([key, src]) => {
    const audio = new Audio(src)
    audio.volume = 0.5
    return [key, audio]
  })
)

// car_start plays at slightly lower volume since it's a long roar
if (pool.car_start) pool.car_start.volume = 0.7
if (pool.rev)       pool.rev.volume = 0.8

export function play(key) {
  if (muted) return
  const audio = pool[key]
  if (!audio) return
  audio.currentTime = 0
  audio.play().catch(() => {})
}

export function setMuted(val) {
  muted = val
  localStorage.setItem('sfx_muted', String(val))
}

export function isMuted() {
  return muted
}
