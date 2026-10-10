import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getSoundSettings, play, setMuted, setVolume, subscribeSound } from '../../utils/sfx.js'

let snapshot = getSoundSettings()
function getSnapshot() {
  const next = getSoundSettings()
  if (next.volume !== snapshot.volume || next.muted !== snapshot.muted) snapshot = next
  return snapshot
}

function SpeakerIcon({ level }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" stroke="none" />
      {level === 0 && <path d="M11 6l4 4M15 6l-4 4" />}
      {level > 0 && <path d="M11 5.5a3.5 3.5 0 010 5" />}
      {level > 0.5 && <path d="M12.5 3a6.5 6.5 0 010 10" />}
    </svg>
  )
}

export function SoundButton({ popoverClassName = 'right-0 top-11' }) {
  const { volume, muted } = useSyncExternalStore(subscribeSound, getSnapshot)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const level = muted ? 0 : volume

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Sound"
        aria-label="Sound settings"
        aria-expanded={open}
        className="w-9 h-9 flex items-center justify-center rounded border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <SpeakerIcon level={level} />
      </button>

      {open && (
        <div className={`absolute ${popoverClassName} z-50 w-56 p-3 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl space-y-3`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] uppercase tracking-wider">Sound</span>
            <span className="font-mono text-[var(--text-primary)]">{muted ? 'Muted' : `${Math.round(volume * 100)}%`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(volume * 100)}
            onChange={e => { setVolume(Number(e.target.value) / 100); if (muted) setMuted(false) }}
            onPointerUp={() => play('select')}
            aria-label="Volume"
            className="w-full accent-[var(--accent-yellow)]"
          />
          <button
            onClick={() => { const next = !muted; setMuted(next); if (!next) play('select') }}
            className={`w-full py-1.5 rounded text-xs font-bold ${
              muted
                ? 'bg-[var(--accent-yellow)] text-black'
                : 'bg-[var(--panel-border)] text-[var(--text-primary)]'
            }`}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      )}
    </div>
  )
}
