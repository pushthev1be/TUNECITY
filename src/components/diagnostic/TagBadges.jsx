const CATEGORY_COLORS = {
  catastrophic: 'bg-[var(--tag-catastrophic)] text-white',
  penalty:      'bg-[var(--tag-penalty)] text-white',
  positive:     'bg-[var(--tag-positive)] text-white',
  character:    'bg-[var(--tag-character)] text-white',
}

export function TagBadges({ activeTags }) {
  if (!activeTags?.length) return null

  return (
    <div className="flex flex-wrap gap-1">
      {activeTags.map(tag => (
        <span
          key={tag.id}
          title={tag.description}
          className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wide ${CATEGORY_COLORS[tag.category] ?? 'bg-gray-600 text-white'}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  )
}
