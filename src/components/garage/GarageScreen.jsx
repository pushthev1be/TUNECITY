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

  return (
    <div className="h-screen flex flex-col bg-[var(--garage-bg)] overflow-hidden">

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
          <Button variant="ghost" onClick={() => setMissions(true)} className="text-xs">Missions</Button>
          <Button variant="ghost" onClick={() => setInventory(true)} className="text-xs">Inventory</Button>
          <Button variant="ghost" onClick={() => setShopOpen(true)} className="text-xs">Parts Shop</Button>
          <Button variant="danger" onClick={() => setBlackMarket(true)} className="text-xs border border-[var(--accent-red)]/50">Black Market</Button>
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

          {/* ── Overlays (absolute = scoped to workspace, never hides diagnostics) ── */}
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

        </div>

      </div>
    </div>
  )
}
