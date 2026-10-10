import { useState } from 'react'
import { useGameStore } from '../../stores/useGameStore.js'
import { DiagnosticPanel } from '../diagnostic/DiagnosticPanel.jsx'
import { GarageBay } from './GarageBay.jsx'
import { ObjectivePanel } from './ObjectivePanel.jsx'
import { IgnitionButton } from '../ignition/IgnitionButton.jsx'
import { IgnitionSequence } from '../ignition/IgnitionSequence.jsx'
import { BenchmarkResultCard } from '../ignition/BenchmarkResultCard.jsx'
import { PartsShop } from '../shop/PartsShop.jsx'
import { BlackMarketShop } from '../shop/BlackMarketShop.jsx'
import { InventoryModal } from '../shop/InventoryModal.jsx'
import { MissionSelect } from '../mission/MissionSelect.jsx'
import { MissionCompleteCard } from '../mission/MissionCompleteCard.jsx'
import { Button } from '../shared/Button.jsx'
import { useMediaQuery, MOBILE_QUERY } from '../../hooks/useMediaQuery.js'
import { useFullscreen } from '../../hooks/useFullscreen.js'
import { Money } from '../shared/Money.jsx'
import { play } from '../../utils/sfx.js'
import { SoundButton } from '../shared/SoundButton.jsx'

export function GarageScreen() {
  const [shopOpen, setShopOpen]       = useState(false)
  const [shopSlot, setShopSlot]       = useState(null)
  const [missionsOpen, setMissions]       = useState(false)
  const [inventoryOpen, setInventory]     = useState(false)
  const [blackMarketOpen, setBlackMarket] = useState(false)

  const ignitionResult  = useGameStore(s => s.ignitionResult)
  const missionComplete = useGameStore(s => s.missionCompleteData)
  const getObjective    = useGameStore(s => s.getActiveObjective)
  const objective       = getObjective()

  function handleSlotClick(slot) {
    play('popup_open')
    setShopSlot(slot)
    setShopOpen(true)
  }

  const isMobile = useMediaQuery(MOBILE_QUERY)
  const opener = set => () => { play('popup_open'); set(true) }
  const closer = set => () => { play('popup_close'); set(false) }
  const nav = {
    missions:    opener(setMissions),
    inventory:   opener(setInventory),
    shop:        opener(setShopOpen),
    blackMarket: opener(setBlackMarket),
  }

  // Overlays are scoped to the workspace on desktop so diagnostics stay visible
  const overlays = (
    <>
      <IgnitionSequence />
      {ignitionResult  && <BenchmarkResultCard />}
      {shopOpen && (
        <PartsShop
          filterSlot={shopSlot}
          onClose={() => { play('popup_close'); setShopOpen(false); setShopSlot(null) }}
        />
      )}
      {missionsOpen      && <MissionSelect onClose={closer(setMissions)} />}
      {inventoryOpen     && <InventoryModal onClose={closer(setInventory)} />}
      {blackMarketOpen   && <BlackMarketShop onClose={closer(setBlackMarket)} />}
      {missionComplete   && <MissionCompleteCard />}
    </>
  )

  if (isMobile) {
    return <MobileGarage nav={nav} objective={objective} onSlotClick={handleSlotClick} overlays={overlays} />
  }

  return (
    <div className="h-dvh flex flex-col bg-[var(--garage-bg)] overflow-hidden">

      {/* Nav bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-[var(--panel-border)] z-10 relative">
        <h1 className="text-[var(--accent-yellow)] font-bold text-xl tracking-widest uppercase">
          TuneCity
        </h1>
        <div className="flex gap-3 items-center">
          {objective && (
            <span className="text-[var(--text-muted)] text-xs hidden sm:block">
              Mission: <span className="text-[var(--accent-yellow)]">{objective.name}</span>
            </span>
          )}
          <Button variant="ghost" onClick={nav.missions} className="text-xs">Missions</Button>
          <Button variant="ghost" onClick={nav.inventory} className="text-xs">Inventory</Button>
          <Button variant="ghost" onClick={nav.shop} className="text-xs">Parts Shop</Button>
          <Button variant="danger" onClick={nav.blackMarket} className="text-xs border border-[var(--accent-red)]/50">Black Market</Button>
          <SoundButton />
          <FullscreenButton />
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left — Diagnostic panel (never covered by overlays) */}
        <aside className="w-[18vw] min-w-[256px] shrink-0 border-r border-[var(--panel-border)] overflow-y-auto p-4 bg-[var(--panel-bg)]/80 backdrop-blur-sm z-10 panel-scanline">
          <DiagnosticPanel onSlotClick={handleSlotClick} />
        </aside>

        {/* Workspace — garage bay + right panel; overlays scoped here only */}
        <div className="flex-1 relative flex overflow-hidden min-w-0">

          {/* Center — Garage bay */}
          <div className="flex-1 relative min-w-0">
            <GarageBay />
          </div>

          {/* Right — Objective & stats panel */}
          <aside className="w-[20vw] min-w-[272px] shrink-0 border-l border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-sm overflow-hidden panel-scanline">
            <ObjectivePanel />
          </aside>

          {overlays}
        </div>

      </div>
    </div>
  )
}

function FullscreenButton({ className = '' }) {
  const { supported, active, toggle } = useFullscreen()
  if (!supported) return null
  return (
    <button
      onClick={toggle}
      title={active ? 'Exit fullscreen' : 'Fullscreen'}
      aria-label={active ? 'Exit fullscreen' : 'Fullscreen'}
      className={`w-9 h-9 flex items-center justify-center rounded border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {active
          ? <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" />
          : <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" />}
      </svg>
    </button>
  )
}

const MOBILE_NAV = [
  { key: 'missions',    label: 'Missions',  icon: 'M3 1v14M3 2h9l-2 3 2 3H3' },
  { key: 'inventory',   label: 'Inventory', icon: 'M2 5h12v9H2zM5 5V3h6v2M2 9h12' },
  { key: 'shop',        label: 'Shop',      icon: 'M10 2a3 3 0 00-2.8 4L2 11.2 4.8 14 10 8.8A3 3 0 0014 6l-2 1-2-2 1-2z' },
  { key: 'blackMarket', label: 'Black Mkt', icon: 'M8 2a5 5 0 00-5 5v3h2v3h6v-3h2V7a5 5 0 00-5-5zM6 7v2M10 7v2', danger: true },
]

function NavIcon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function MobileGarage({ nav, objective, onSlotClick, overlays }) {
  const [tab, setTab] = useState('mission')
  const currency    = useGameStore(s => s.currency)
  const isLandscape = useMediaQuery('(orientation: landscape)')

  const tabs = (
    <div className="shrink-0 flex items-stretch border-b border-[var(--panel-border)]">
      {[['mission', objective ? 'Mission' : 'Ignite'], ['build', 'Build']].map(([key, label]) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 ${
            tab === key
              ? 'text-[var(--accent-yellow)] border-[var(--accent-yellow)]'
              : 'text-[var(--text-muted)] border-transparent'
          }`}
        >
          {label}
        </button>
      ))}
      {isLandscape && (
        <div className="flex items-center px-3 border-l border-[var(--panel-border)]">
          <Money amount={currency} iconSize={14} className="text-[var(--tag-positive)] text-xs" />
        </div>
      )}
    </div>
  )

  const panel = (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--panel-bg)] panel-scanline">
      {tabs}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'mission'
          ? <ObjectivePanel compact />
          : <div className="h-full p-3"><DiagnosticPanel onSlotClick={onSlotClick} /></div>}
      </div>
    </div>
  )

  // Landscape (preferred on phones): a slim nav rail on the left so the garage
  // and panel get the full screen height
  if (isLandscape) {
    return (
      <div
        className="h-dvh flex bg-[var(--garage-bg)] overflow-hidden relative"
        style={{
          paddingLeft:  'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <nav className="shrink-0 w-14 flex flex-col items-center gap-1 py-2 border-r border-[var(--panel-border)] bg-[var(--panel-bg)]">
          <span className="text-[var(--accent-yellow)] font-bold text-sm tracking-widest mb-1" title="TuneCity">TC</span>
          {MOBILE_NAV.map(item => (
            <button
              key={item.key}
              onClick={nav[item.key]}
              aria-label={item.label}
              className={`w-12 py-1.5 rounded flex flex-col items-center gap-0.5 text-[9px] font-bold leading-none ${
                item.danger
                  ? 'bg-[var(--accent-red)] text-white'
                  : 'text-[var(--text-primary)] hover:bg-[var(--panel-border)]'
              }`}
            >
              <NavIcon d={item.icon} />
              {item.label}
            </button>
          ))}
          <div className="mt-auto flex flex-col items-center gap-1">
            <SoundButton popoverClassName="left-11 bottom-0" />
            <FullscreenButton />
          </div>
        </nav>

        <div className="relative flex-1 min-w-0 h-full">
          <GarageBay />
        </div>
        <div className="w-[42%] max-w-[420px] h-full flex">
          {panel}
        </div>

        {overlays}
      </div>
    )
  }

  return (
    <div
      className="h-dvh flex flex-col bg-[var(--garage-bg)] overflow-hidden relative"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <RotateHint />
      <header className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-[var(--panel-border)]">
        <h1 className="text-[var(--accent-yellow)] font-bold text-base tracking-widest uppercase mr-auto">TuneCity</h1>
        <Money amount={currency} className="text-[var(--tag-positive)] text-sm" />
        <SoundButton />
        <FullscreenButton />
      </header>

      <nav className="shrink-0 grid grid-cols-4 gap-1 px-2 py-1.5 border-b border-[var(--panel-border)]">
        {MOBILE_NAV.map(item => (
          <button
            key={item.key}
            onClick={nav[item.key]}
            className={`py-2 px-2.5 rounded text-[11px] font-bold ${
              item.danger
                ? 'bg-[var(--accent-red)] text-white'
                : 'bg-[var(--panel-border)] text-[var(--text-primary)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="relative shrink-0 h-[42%] w-full">
          <GarageBay />
        </div>
        {panel}
      </div>

      {overlays}
    </div>
  )
}

// Portrait phones: suggest rotating; dismissible for the session
function RotateHint() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('rotate_hint_dismissed') === '1' } catch { return false }
  })
  if (dismissed) return null

  function dismiss() {
    setDismissed(true)
    try { sessionStorage.setItem('rotate_hint_dismissed', '1') } catch { /* storage blocked */ }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[var(--garage-bg)]/95 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--accent-yellow)" strokeWidth="1.5" aria-hidden="true" className="animate-[rotate-hint_2s_ease-in-out_infinite]">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
      <div className="space-y-1">
        <p className="text-[var(--accent-yellow)] font-bold uppercase tracking-widest">Rotate your phone</p>
        <p className="text-[var(--text-muted)] text-sm">TuneCity plays best in landscape.</p>
      </div>
      <button onClick={dismiss} className="text-[var(--text-muted)] text-xs underline underline-offset-4">
        Continue in portrait
      </button>
    </div>
  )
}
