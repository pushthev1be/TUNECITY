import { useEffect, useState } from 'react'

const root = () => document.documentElement

export function useFullscreen() {
  const supported = !!(root().requestFullscreen || root().webkitRequestFullscreen)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const onChange = () => setActive(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  function toggle() {
    if (active) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
    } else {
      const el = root()
      Promise.resolve((el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' }))
        // The game is laid out for landscape; browsers that allow it (Android) lock to it
        .then(() => screen.orientation?.lock?.('landscape'))
        .catch(() => {})
    }
  }

  return { supported, active, toggle }
}
