import objectivesData from '../../data/objectives.json'
import { useGameStore } from '../../stores/useGameStore.js'
import { MissionBriefCard } from './MissionBriefCard.jsx'

export function MissionSelect({ onClose }) {
  const activeObjectiveId  = useGameStore(s => s.activeObjectiveId)
  const completedObjectives = useGameStore(s => s.completedObjectives)
  const isUnlocked         = useGameStore(s => s.isObjectiveUnlocked)
  const setActive          = useGameStore(s => s.setActiveObjective)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--panel-border)]">
          <h2 className="text-[var(--accent-yellow)] font-bold uppercase tracking-widest">Missions</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {objectivesData.map(obj => (
            <MissionBriefCard
              key={obj.id}
              objective={obj}
              isUnlocked={isUnlocked(obj.id)}
              isCompleted={completedObjectives.includes(obj.id)}
              isActive={obj.id === activeObjectiveId}
              onClick={() => {
                setActive(obj.id)
                onClose()
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
