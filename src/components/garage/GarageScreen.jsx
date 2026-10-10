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
    setShopSlot(slot)
    setShopOpen(true)
  }

  const isMobile = useMediaQuery(MOBILE_QUERY)
  const nav = {
    missions:    () => setMissions(true),
    inventory:   () => setInventory(true),
    shop:        () => setShopOpen(true),
    blackMarket: () => setBlackMarket(true),
  }

  // Overlays are scoped to the workspace on desktop so diagnostics stay visible
  const overlays = (
    <>
      <IgnitionSequence />
      {ignitionResult  && <BenchmarkResultCard />}
      {shopOpen && (
        <PartsShop
          filterSlot={shopSlot}
          onClose={() => { setShopOpen(false); setShopSlot(null) }}
        />
      )}
      {missionsOpen      && <MissionSelect onClose={() => setMissions(false)} />}
      {inventoryOpen     && <InventoryModal onClose={() => setInventory(false)} />}
      {blackMarketOpen   && <BlackMarketShop onClose={() => setBlackMarket(false)} />}
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
  { key: 'missions',    label: 'Missions' },
  { key: 'inventory',   label: 'Inventory' },
  { key: 'shop',        label: 'Shop' },
  { key: 'blackMarket', label: 'Black Mkt', danger: true },
]

function MobileGarage({ nav, objective, onSlotClick, overlays }) {
  const [tab, setTab] = useState('mission')
  const currency    = useGameStore(s => s.currency)
  const isLandscape = useMediaQuery('(orientation: landscape)')

  const navButtons = MOBILE_NAV.map(item => (
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
  ))

  const panel = (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--panel-bg)] panel-scanline">
      <div className="shrink-0 grid grid-cols-2 border-b border-[var(--panel-border)]">
        {[['mission', objective ? 'Mission' : 'Ignite'], ['build', 'Build']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 ${
              tab === key
                ? 'text-[var(--accent-yellow)] border-[var(--accent-yellow)]'
                : 'text-[var(--text-muted)] border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'mission'
          ? <ObjectivePanel compact />
          : <div className="h-full p-4"><DiagnosticPanel onSlotClick={onSlotClick} /></div>}
      </div>
    </div>
  )

  return (
    <div
      className="h-dvh flex flex-col bg-[var(--garage-bg)] overflow-hidden relative"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <header className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-[var(--panel-border)]">
        <h1 className="text-[var(--accent-yellow)] font-bold text-base tracking-widest uppercase mr-auto">TuneCity</h1>
        {isLandscape && navButtons}
        <Money amount={currency} className="text-[var(--tag-positive)] text-sm" />
        <FullscreenButton />
      </header>

      {!isLandscape && (
        <nav className="shrink-0 grid grid-cols-4 gap-1 px-2 py-1.5 border-b border-[var(--panel-border)]">
          {navButtons}
        </nav>
      )}

      <div className={`flex-1 min-h-0 flex ${isLandscape ? 'flex-row' : 'flex-col'}`}>
        <div className={`relative shrink-0 ${isLandscape ? 'w-[55%] h-full' : 'h-[42%] w-full'}`}>
          <GarageBay />
        </div>
        {panel}
      </div>

      {overlays}
    </div>
  )
}
