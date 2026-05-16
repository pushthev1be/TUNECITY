import { useState, useEffect } from 'react'

// Dynamically import all rotation frames for a named sprite.
// spriteKey must match the folder name under /assets/sprites/rotations/
const FRAME_CACHE = {}

function useRotationFrames(spriteKey) {
  const [frames, setFrames] = useState(FRAME_CACHE[spriteKey] ?? [])

  useEffect(() => {
    if (!spriteKey) return
    if (FRAME_CACHE[spriteKey]) { setFrames(FRAME_CACHE[spriteKey]); return }

    // Vite glob import — resolved at build time for all rotation PNGs
    const allModules = import.meta.glob('/src/assets/sprites/rotations/**/*.png', { eager: true })

    const loaded = []
    for (let i = 0; i < 8; i++) {
      const key = `/src/assets/sprites/rotations/${spriteKey}/${i}.png`
      if (allModules[key]) loaded.push(allModules[key].default)
    }

    FRAME_CACHE[spriteKey] = loaded
    setFrames(loaded)
  }, [spriteKey])

  return frames
}

export function RotatingSprite({ spriteKey, size = 64, fps = 8, className = '', style = {} }) {
  const frames = useRotationFrames(spriteKey)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (frames.length <= 1) return
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 1000 / fps)
    return () => clearInterval(id)
  }, [frames.length, fps])

  if (!frames.length) {
    return (
      <div
        style={{ width: size, height: size, ...style }}
        className={`bg-[var(--panel-border)] rounded opacity-30 ${className}`}
      />
    )
  }

  return (
    <img
      src={frames[frame]}
      alt={spriteKey}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', objectFit: 'contain', ...style }}
      className={className}
    />
  )
}
