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

function supportsAiff() {
  try { return new Audio().canPlayType('audio/x-aiff') !== '' } catch { return false }
}

const SOUNDS = {
  cursor:       sfxCursor,
  select:       sfxSelect,
  cancel:       sfxCancel,
  buy:          sfxBuy,
  error:        sfxError,
  ignite:       sfxIgnite,
  popup_open:   sfxPopupOpen,
  popup_close:  sfxPopupClose,
  car_start:    sfxEngineStart,
  engine_fail:  sfxEngineFail,
  ignition_fail:sfxIgnitionFail,
  turbo_fail:   sfxTurboFail,
  rev:          sfxEngineStart,
}

let muted = localStorage.getItem('sfx_muted') === 'true'

const pool = Object.fromEntries(
  Object.entries(SOUNDS).map(([key, src]) => {
    const audio = new Audio(src)
    audio.volume = 0.5
    return [key, audio]
  })
)

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

export function isMuted() { return muted }
