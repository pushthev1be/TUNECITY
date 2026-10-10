// Display names and units for build stats used in mission targets
const STATS = {
  hp:            ['HP', 'hp'],
  torque:        ['Torque', 'lb-ft'],
  reliability:   ['Reliability', '%'],
  zero_to_sixty: ['0–60', 's'],
  top_speed:     ['Top Speed', 'mph'],
  quarter_mile:  ['¼ Mile', 's'],
  grip:          ['Grip', 'g'],
  heat_output:   ['Heat', ''],
}

export function statLabel(stat) {
  return STATS[stat]?.[0] ?? stat
}

export function statUnit(stat) {
  return STATS[stat]?.[1] ?? ''
}
