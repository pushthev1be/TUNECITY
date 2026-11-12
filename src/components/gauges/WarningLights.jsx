// The dash warning lights, lit from the build's diagnosis like a real car's.
// Red = it will not run / will break; amber = it runs but something is wrong.

const ICONS = {
  // battery: case, two terminals, + and -
  battery: <><rect x="3" y="7" width="18" height="12" rx="1.5" /><path d="M7 7V5h3v2M14 7V5h3v2M6.5 13h4M8.5 11v4M14 13h4" /></>,
  // check engine: the engine silhouette
  engine: <path d="M4 10h2V8h3V6h6v2h3l2 3v5h-2v2h-3l-2 2H9v-2H6v-2H4z M2 11v4" />,
  // fuel: pump with hose
  fuel: <><path d="M5 20V5a1 1 0 011-1h7a1 1 0 011 1v15M3 20h13M6 8h7" /><path d="M14 10h2a2 2 0 012 2v4a1.5 1.5 0 003 0V9l-3-3" /></>,
  // coolant temperature: thermometer over waves
  temp: <><path d="M12 3v10M9.5 6h2.5M9.5 9h2.5" /><circle cx="12" cy="15" r="2.5" /><path d="M3 20c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0" /></>,
  // oil: the oil can with a drip
  oil: <><path d="M3 11h4l2-2h6l6-3-5 7H5a2 2 0 01-2-2z" /><path d="M9 9V7h3M20 15c0 1-.7 1.6-1.4 1.6S17.2 16 17.2 15c0-.8 1.4-2.4 1.4-2.4S20 14.2 20 15z" /></>,
  // boost: a turbo's snail
  boost: <><circle cx="11" cy="12" r="6" /><path d="M11 12a2.5 2.5 0 112.5-2.5M17 12h4M11 6V3" /></>,
  // tyre pressure: the horseshoe with an exclamation mark
  tire: <><path d="M6 6c-3 4-3 8 0 12M18 6c3 4 3 8 0 12M6 18h12M6 6h12" /><path d="M12 8v5M12 15.5v.5" /></>,
}

const RULES = [
  { key: 'battery', name: 'Battery',      red: ['wont_turn_over'] },
  { key: 'engine',  name: 'Check engine', red: ['no_spark', 'no_compression', 'grenaded', 'hydrolocked'], amber: ['blown', 'nos_stress', 'bogs_down'] },
  { key: 'fuel',    name: 'Fuel',         red: ['fuel_starved'] },
  { key: 'temp',    name: 'Coolant temp', red: ['overheated'], amber: ['overheating'] },
  { key: 'oil',     name: 'Oil',          red: ['hydrolocked'], amberSmoke: ['blue'] },
  { key: 'boost',   name: 'Boost',        amber: ['turbo_lag'] },
  { key: 'tire',    name: 'Tires',        amber: ['rubs', 'scrapes'] },
]

export function lightsFor(tagIds, smokeColor) {
  return RULES.map(r => {
    const state = r.red?.some(t => tagIds.has(t)) ? 'red'
      : (r.amber?.some(t => tagIds.has(t)) || r.amberSmoke?.includes(smokeColor)) ? 'amber' : 'off'
    return { ...r, state }
  })
}

const COLOR = { red: '#ff3b30', amber: '#ffb020', off: '#3a3d44' }

export function WarningLights({ activeTags = [], smokeColor = null }) {
  const ids = new Set(activeTags.map(t => t.id))
  const lights = lightsFor(ids, smokeColor)
  const lit = lights.filter(l => l.state !== 'off').length
  return (
    <div className="rounded-lg bg-[#07080a] border border-[#2c2e34] px-2 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
      <div className="grid grid-cols-7 gap-1">
        {lights.map(l => (
          <div key={l.key} title={`${l.name}${l.state === 'off' ? ' — OK' : l.state === 'red' ? ' — fault' : ' — warning'}`}
            className="flex items-center justify-center aspect-square rounded">
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={COLOR[l.state]} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-label={`${l.name} light ${l.state}`}
              style={{
                filter: l.state === 'off' ? 'none' : `drop-shadow(0 0 3px ${COLOR[l.state]})`,
                animation: l.state === 'red' ? 'warn-blink 1.1s steps(1) infinite' : 'none',
              }}>
              {ICONS[l.key]}
            </svg>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-center mt-1 tracking-widest uppercase" style={{ color: lit ? '#ffb020' : '#4b8f63' }}>
        {lit ? `${lit} warning light${lit > 1 ? 's' : ''} on` : 'All systems normal'}
      </p>
    </div>
  )
}
