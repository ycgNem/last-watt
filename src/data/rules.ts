// Run-level numbers (DESIGN.md §2, §5, §8).

interface Rule { v: number; why: string }

export const RULES = {
  startMoney: { v: 120, why: '§5 starting money: 120' },
  startLights: { v: 20, why: '§5 station starts with 20 lights' },
  breather: { v: 20, why: '§5 the next wave starts 20 s after the field clears (Space starts it sooner)' },
  wavePayBase: { v: 15, why: '§5.2 wave pay: 15 + 5 × wave, paid when a wave is cleared, leaks or not' },
  wavePayPer: { v: 5, why: '§5.2 wave pay: 15 + 5 × wave' },
  overchargeCost: { v: 120, why: '§8 Overcharge: flat 120 kJ from storage' },
  overchargeMult: { v: 3, why: '§8 Overcharge: 3× firing draw' },
  overchargeTime: { v: 4, why: '§8 Overcharge: for 4 s' },
  overchargeCool: { v: 10, why: '§8 Overcharge: the glass cools 10 s before it can take another' },
  starvedBelow: { v: 0.6, why: 'STYLE.md rule 1: starved = satisfaction < 0.6' },
  veilSight: { v: 0.6, why: '§5.1 Veil: seen only by a tower above the starved line (0.6)' },
  brownoutEnds: { v: 0.75, why: '§2 brownout ends when the wall is back above 0.75 for 2 s (hysteresis so it does not flap)' },
  windMean: { v: 0.55, why: '§3.2 wind: averages 0.55 of a Vane\'s rating' },
  endlessGrowth: { v: 1.14, why: '§5.3 endless: each wave past the last brings 14% more kJ' },
} satisfies Record<string, Rule>;
