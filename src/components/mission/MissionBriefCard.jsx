import carsData from '../../data/cars.json'
import { Card } from '../shared/Card.jsx'
import { Price } from '../shared/Money.jsx'
import { RotatingSprite } from '../shared/RotatingSprite.jsx'
import { CAR_ROTATION_KEYS } from '../../assets/spriteMap.js'
import { statLabel, statUnit } from '../../data/statLabels.js'
import { findPart } from '../../data/allParts.js'

const OP_LABELS = { gte: '≥', lte: '≤', eq: '=' }
const DIFF_STARS = (d) => '★'.repeat(d) + '☆'.repeat(5 - d)

export function MissionBriefCard({ objective, isUnlocked, isCompleted, isActive, unlockedBy, onClick }) {
  const car = carsData.find(c => c.id === objective.car_id)

  return (
    <Card
      onClick={isUnlocked && !isCompleted ? onClick : undefined}
      className={`p-4 space-y-3 transition-all ${
        !isUnlocked ? 'opacity-40' : isCompleted ? 'border-[var(--tag-positive)]/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {CAR_ROTATION_KEYS[objective.car_id] && (
          <div className={`shrink-0 -my-3 -ml-2 ${isUnlocked ? '' : 'grayscale brightness-50'}`}>
            <RotatingSprite spriteKey={CAR_ROTATION_KEYS[objective.car_id]} size={64} fps={isUnlocked && !isCompleted ? 4 : 0} />
          </div>
        )}
        <div className="flex-1 min-w-0">
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

      {!isUnlocked && unlockedBy ? (
        <p className="text-[var(--text-muted)] text-xs">🔒 Complete <span className="text-[var(--text-primary)]">{unlockedBy.name}</span> to unlock</p>
      ) : (
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Targets</p>
          <ul className="space-y-0.5">
            {objective.targets.map((t, i) => (
              <li key={i} className="text-xs">
                <span className="text-[var(--text-primary)]">{statLabel(t.stat)}</span>
                <span className="text-[var(--text-muted)] mx-1">{OP_LABELS[t.op] ?? t.op}</span>
                <span className="text-[var(--accent-yellow)]">{t.value}{statUnit(t.stat)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">Reward: <Price amount={objective.rewards.currency ?? 0} iconSize={12} className="text-[var(--tag-positive)]" /></span>
        {objective.constraints.find(c => c.type === 'budget') && (
          <span>Budget: ${objective.constraints.find(c => c.type === 'budget').max.toLocaleString()}</span>
        )}
        {objective.rewards.parts?.length > 0 && (
          <span className="w-full text-[var(--tag-character)]">
            + {objective.rewards.parts.map(id => findPart(id)?.name ?? id).join(', ')}
          </span>
        )}
      </div>
    </Card>
  )
}
