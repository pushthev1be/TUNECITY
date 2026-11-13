import { useId } from 'react'

// An analog dash gauge, drawn like the real thing: metal bezel, dark face, a
// 240 degree scale with major/minor ticks and numbers, a red zone, a needle that
// swings to its value with a little overshoot, and a digital readout below.

const START = -210            // degrees, clockwise from 3 o'clock: lower left
const SWEEP = 240             // to lower right

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function arcPath(cx, cy, r, d0, d1) {
  const [x0, y0] = polar(cx, cy, r, d0)
  const [x1, y1] = polar(cx, cy, r, d1)
  const large = Math.abs(d1 - d0) > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

/**
 * @param label   name printed on the face (e.g. "POWER")
 * @param value   current reading; null shows the needle at rest and "—"
 * @param min,max scale
 * @param majors  number of numbered divisions
 * @param scaleLabel  how a major tick's value is printed (default: as is)
 * @param red     [from, to] of the red zone in scale units, or null
 * @param readout text for the digital window (default: value + unit)
 * @param faceText small words on the face, e.g. "x100 HP" or "C   H"
 */
export function Gauge({
  label, value, min = 0, max = 100, majors = 6, minorsPer = 4, unit = '',
  scaleLabel = v => Math.round(v), red = null, readout, faceText, size = 140,
  accent = '#ff8a1f',
}) {
  const cx = 60, cy = 60
  const uid = useId().replace(/:/g, '')
  const clamp = v => Math.max(min, Math.min(max, v))
  const toDeg = v => START + ((clamp(v) - min) / (max - min)) * SWEEP
  const needle = value == null ? START : toDeg(value)
  const ticks = []
  const steps = majors * minorsPer
  for (let i = 0; i <= steps; i++) {
    const v = min + ((max - min) * i) / steps
    const d = toDeg(v)
    const major = i % minorsPer === 0
    const [x0, y0] = polar(cx, cy, major ? 41 : 44, d)
    const [x1, y1] = polar(cx, cy, 48, d)
    const inRed = red && v >= red[0] && v <= red[1]
    ticks.push(
      <line key={`t${i}`} x1={x0} y1={y0} x2={x1} y2={y1}
        stroke={inRed ? '#ff3b30' : '#e8e6df'} strokeWidth={major ? 2 : 1} strokeLinecap="square" />
    )
    if (major) {
      const [tx, ty] = polar(cx, cy, 33, d)
      ticks.push(
        <text key={`n${i}`} x={tx} y={ty + 3} textAnchor="middle" fontSize="8.5" fontWeight="700"
          fill={inRed ? '#ff3b30' : '#e8e6df'} fontFamily="inherit">{scaleLabel(v)}</text>
      )
    }
  }
  const text = readout ?? (value == null ? '—' : `${typeof value === 'number' ? Math.round(value) : value}${unit}`)

  return (
    <figure className="flex flex-col items-center select-none" style={{ width: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${label}: ${text}`}>
        <defs>
          <linearGradient id={`bezel${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9dbe0" />
            <stop offset="0.5" stopColor="#6b6f78" />
            <stop offset="1" stopColor="#2a2c31" />
          </linearGradient>
          <radialGradient id={`face${uid}`} cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#23252b" />
            <stop offset="1" stopColor="#0d0e11" />
          </radialGradient>
        </defs>
        {/* bezel and face */}
        <circle cx={cx} cy={cy} r="58" fill={`url(#bezel${uid})`} />
        <circle cx={cx} cy={cy} r="53" fill="#08090b" />
        <circle cx={cx} cy={cy} r="51" fill={`url(#face${uid})`} />
        {/* red zone band */}
        {red && (
          <path d={arcPath(cx, cy, 46, toDeg(red[0]), toDeg(red[1]))}
            stroke="#ff3b30" strokeWidth="5" fill="none" opacity="0.9" />
        )}
        {ticks}
        {/* face words */}
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize="7" fill="#9a9ca3" letterSpacing="1" fontFamily="inherit">
          {faceText}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="8" fontWeight="700" fill={accent} letterSpacing="1.5" fontFamily="inherit">
          {label}
        </text>
        {/* needle: rotates about the hub, springs to its value */}
        <g style={{
          transform: `rotate(${needle - START}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'transform 0.9s cubic-bezier(0.34, 1.45, 0.64, 1)',
        }}>
          <path d={`M ${polar(cx, cy, -9, START)[0]} ${polar(cx, cy, -9, START)[1]} L ${polar(cx, cy, 46, START)[0]} ${polar(cx, cy, 46, START)[1]}`}
            stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r="6" fill="#2b2d33" stroke="#70737b" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="2" fill="#0d0e11" />
        {/* digital window */}
        <rect x={cx - 22} y={cy + 28} width="44" height="13" rx="2" fill="#050607" stroke="#2c2e34" />
        <text x={cx} y={cy + 37.5} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#7CFFB2" fontFamily="ui-monospace, monospace">
          {text}
        </text>
      </svg>
    </figure>
  )
}
