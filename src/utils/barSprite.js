// bars05.png: 8 fill-state frames across 384px (48px each)
// frame 0 (left) = full/green, frame 7 (right) = empty/dark
// background-size: 800% means 1 frame = 100% of div width
// bgX formula: idx/7 * 100% correctly maps frame index to background-position %
export function barSpriteStyle(pct) {
  const idx = Math.min(7, Math.floor((1 - pct) * 8))
  const bgX = idx === 0 ? '0%' : `${(idx / 7 * 100).toFixed(2)}%`
  return {
    backgroundImage: "url('/ui/bars05.png')",
    backgroundPosition: `${bgX} 0%`,
    backgroundSize: '800% 100%',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  }
}
