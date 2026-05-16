import carsData from '../../data/cars.json'
import { Card } from '../shared/Card.jsx'

const OP_LABELS = { gte: '≥', lte: '≤', eq: '=' }
const DIFF_STARS = (d) => '★'.repeat(d) + '☆'.repeat(5 - d)

export function MissionBriefCard({ objective, isUnlocked, isCompleted, isActive, onClick }) {
  const car = carsData.find(c => c.id === objective.car_id)

  return (
    <Card
      onClick={isUnlocked && !isCompleted ? onClick : undefined}
      className={`p-4 space-y-3 transition-all ${
        !isUnlocked ? 'opacity-40' : isCompleted ? 'border-[var(--tag-positive)]/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={`font-bold text-sm ${isActive ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-primary)]'}`}>
            {isActive && <span className="mr-1">▶</span>}
            {objective.name}
          </h3>
          <p className="text-[var(--text-muted)] text-xs">{car?.name ?? objective.car_id}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[var(--accent-yellow)] text-xs">{DIFF_STARS(objective.difficulty)}</p>
          {isCompleted && <p className="text-[var(--tag-positive)] text-xs font-bold">✓ Done</p>}
          {!isUnlocked && <p className="text-[var(--text-muted)] text-xs">🔒 Locked</p>}
        </div>
      </div>

      <p className="text-[var(--text-muted)] text-xs">{objective.description}</p>

      <div>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Targets</p>
        <ul className="space-y-0.5">
          {objective.targets.map((t, i) => (
            <li key={i} className="text-xs">
              <span className="text-[var(--text-primary)]">{t.stat}</span>
              <span className="text-[var(--text-muted)] mx-1">{OP_LABELS[t.op] ?? t.op}</span>
              <span className="text-[var(--accent-yellow)]">{t.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Reward: <span className="text-[var(--tag-positive)]">${objective.rewards.currency?.toLocaleString()}</span></span>
        {objective.constraints.find(c => c.type === 'budget') && (
          <span>Budget: ${objective.constraints.find(c => c.type === 'budget').max.toLocaleString()}</span>
        )}
      </div>
    </Card>
  )
}
