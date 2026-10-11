// The loss screen's one line on why a run was lost (the second review's ask), by rule: the player's
// own Overcharges, then what a starved wall's power was lost to (the sixth review M1), then the
// enemy kinds that took the last quarter of the lights. Pure: it reads the run's stats.
import { ENEMIES } from '../data/enemies';
import { RULES } from '../data/rules';
import type { Game } from '../sim/Game';
import type { LossCause } from '../sim/types';

/** one line on why a run was lost, by rule (the second review's ask) */
export function diagnose(g: Game): string {
  const s = g.stats;
  // the leaks that took the last quarter of the lights decide what the run died of
  const total = s.leakLog.reduce((a, l) => a + l.lights, 0);
  const tail: typeof s.leakLog = [];
  let sum = 0;
  for (let i = s.leakLog.length - 1; i >= 0 && sum < Math.max(1, total / 4); i--) {
    tail.push(s.leakLog[i]);
    sum += s.leakLog[i].lights;
  }
  const by = (k: string) => tail.filter((l) => l.enemy === k).reduce((a, l) => a + l.lights, 0);
  if (sum === 0) return 'More towers at the bends, and keep them fed.';
  // "more Burners" only when power was short, not when it was being thrown away (the fifth
  // review), and only what was thrown away mid-wave counts (the sixth: the breather wastes most)
  const wasteful = s.wastedLiveKj > s.kjDelivered * 0.25;
  const morePower = wasteful ? `Jars to carry the peaks (you wasted ${Math.round(s.wastedLiveKj)} kJ mid-wave)` : 'more Burners';
  // the player's own bursts first: they take the rest of the wall (the fifth review M4)
  const ocStarved = tail.filter((l) => l.overcharged && l.wall < 0.5).reduce((a, l) => a + l.lights, 0);
  if (ocStarved >= sum / 2)
    return `Your own Overcharges: ${ocStarved} of the last ${sum} lights got through while a burst held your wall under half. Each one takes the rest of the wall for 4 s; save them for a Pall.`;
  // then what the starved wall's power was lost to, from the supply ledger of the waves those
  // lights went in (the sixth review M1: snuffed Burners were blamed on Veils and Pulse)
  const starved = tail.reduce((a, l) => a + l.wall * l.lights, 0) / sum < 0.75;
  if (starved) {
    // the waves the last quarter went in, and the worst wave by lights (the seventh review: the
    // line quoted the last wave's 1,311 kJ while the worst had lost 3,518)
    let worst = 1;
    for (let i = 1; i < s.lightsByWave.length; i++) if ((s.lightsByWave[i] ?? 0) > (s.lightsByWave[worst] ?? 0)) worst = i;
    const waves = [...new Set([...tail.map((l) => l.wave), worst])];
    const led: Partial<Record<LossCause, number>> = {};
    for (const w of waves) for (const [k, v] of Object.entries(s.lossByWave[w] ?? {})) led[k as LossCause] = (led[k as LossCause] ?? 0) + (v ?? 0);
    const all = Object.values(led).reduce((a, b) => a + (b ?? 0), 0);
    const [top, kj] = (Object.entries(led) as [LossCause, number][]).sort((a, b) => b[1] - a[1])[0] ?? ['short', 0];
    const when = waves.length === 1 ? `in wave ${waves[0]}` : `in waves ${waves.sort((a, b) => a - b).join(', ')}`;
    const k = Math.round(kj);
    if (all > 0 && kj >= all * 0.3) {
      if (top === 'snuff') return `Snuffers put out your Burners: ${k} kJ of supply lost ${when}, and the wall starved. A Burner more than ${ENEMIES.snuffer.snuffRadius} tiles from the road is out of their reach (red shows it as you place one), and a Burner on coke (a Coker beside it) burns through a snuff.`;
      if (top === 'dry') return `Your Burners ran dry: ${k} kJ of supply lost ${when}, and the wall starved. An Extractor feeds a Burner and a quarter; a Deep bit feeds two.`;
      if (top === 'cut') return `Shades cut your Nodes: towers went dark for ${k} kJ of fire ${when}. Nodes more than ${ENEMIES.shade.knockRadius} tiles from the road, or a second route to what they feed.`;
      if (top === 'held') return `Full Nodes held ${k} kJ back from the towers past them ${when}: a second route, a Jar past the Node, or a Busbar.`;
      // plain shortage: more towers than the Burners can run (the seventh review: it fell through
      // to "Shades got through")
      if (top === 'short') {
        const share = Math.round((tail.reduce((a, l) => a + l.wall * l.lights, 0) / sum) * 100);
        return `Your wall had ${share}% of the power it asked as the lights went ${when}: more towers than your Burners can run. Burners before towers${wasteful ? ', and Jars for the peaks' : ''}.`;
      }
      if (top === 'siphon') return `Siphons drank ${k} kJ from your lines ${when}, ahead of every tower: kill them where they drink (an Overcharge, a Brazier), or keep spare kW on the line they tap.`;
    }
  }
  const lostAll = Object.values(s.lightsLostBy).reduce((a, b) => a + b, 0) || 1;
  if ((s.lightsLostBy.pall ?? 0) / lostAll >= 0.4 && by('pall') > 0) return `Palls took ${s.lightsLostBy.pall} of your ${lostAll} lights. A Pall drinks a beam and hides behind the Moths that overtake it in a cone: burn it (a Brazier burns every body in full), shell it (a Starshell burst lands on everything), or put a cone early on the road and Overcharge it there, on the Hearth's own reach where no Node caps the burst.`;
  const veilsStarved = tail.filter((l) => l.enemy === 'veil' && l.wall < RULES.veilSight.v);
  if (veilsStarved.length && by('veil') >= sum / 3)
    return veilsStarved.some((l) => l.overcharged)
      ? 'Veils walked past while your wall was under 60%: your Overcharges took the power their towers needed to see them.'
      : `Veils walked past while your wall was under 60%: ${morePower}, or fewer towers firing at once${s.pulses > 0 ? ', or Pulse less (it empties the Jars that carry the wall)' : ''}.`;
  if (by('pall') >= sum / 2) return 'Palls took the last of it. A Pall drinks a beam and hides behind the Moths that overtake it in a cone: burn it (a Brazier burns every body in full, a Pall too), shell it (a Starshell burst lands on everything), or put a cone early on the road, before the Moths catch it up, and Overcharge it there.';
  if (by('siphon') >= sum / 3) return 'Siphons got through: kill them where they drink (an Overcharge, a Brazier), or have spare kW on the line they tap.';
  if (by('flit') >= sum / 3) return 'Flit clumps got through: a cone looking down a straight, a Starshell, or a Brazier behind a Beacon.';
  if (by('shade') >= sum / 3) return 'Shades got through: their 90 kJ needs two towers on them, or an Overcharge as they pass.';
  const lost = lostAll;
  if ((s.lightsLostBy.pall ?? 0) / lost >= 0.4) return 'Palls took most of it. A Pall drinks a beam and hides behind the Moths that overtake it in a cone: burn it (a Brazier burns every body in full, a Pall too), shell it (a Starshell burst lands on everything), or put a cone early on the road, before the Moths catch it up, and Overcharge it there.';
  if (s.brownoutSeconds > 60) return `Your wall spent ${Math.round(s.brownoutSeconds)} s starved: ${wasteful ? morePower : 'more Burners, or Jars to carry the peaks'}.`;
  if (s.wastedKj > s.kjDelivered) return 'You made more power than your towers used: fewer Burners, more towers (or Jars and Labs for the spare).';
  if ((s.lightsLostBy.flit ?? 0) / lost >= 0.3) return 'Flit clumps got through: a cone looking down a straight, a Starshell, or a Brazier behind a Beacon.';
  return 'More towers at the bends, and keep them fed.';
}
