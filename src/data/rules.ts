// Run-level numbers (DESIGN.md §2, §5, §8).

interface Rule { v: number; why: string }

export const RULES = {
  startMoney: { v: 120, why: '§5 starting money: 120' },
  startLights: { v: 20, why: '§5 station starts with 20 lights' },
  waveTimer: { v: 45, why: '§5 wave timer 45 s' },
  callEarlyShare: { v: 0.25, why: '§5 call-early bonus = 25% × next wave bounty × time remaining / timer' },
  overchargeCost: { v: 120, why: '§8 Overcharge: flat 120 kJ from storage' },
  overchargeMult: { v: 3, why: '§8 Overcharge: 3× firing draw' },
  overchargeTime: { v: 4, why: '§8 Overcharge: for 4 s' },
  starvedBelow: { v: 0.6, why: 'STYLE.md rule 1: starved = satisfaction < 0.6' },
} satisfies Record<string, Rule>;
