// A scripted player for balance checks and screenshots (pure: no DOM). It keeps the wall's
// full-fire draw within its generation (buying Extractor + Burner pairs, later Vanes, when it
// isn't), builds towers from a list of spots, gets Jars and a Lab going, researches down a list,
// upgrades what its research allows, sheds the Lab while the wall is starved, and Overcharges at
// Palls, late Shades and crowds near the Hearth. Positions are top-left tiles on SLICE_MAP.
import type { BuildingId } from '../data/buildings';
import type { Game } from '../sim/Game';
import type { Building } from '../sim/types';
import { nextWave, overcharge, overchargeProblem, place, pulse, pulseProblem, setTier, startResearch, toggleOff, upgrade, upgradeProblem } from '../sim/actions';
import { windShade } from '../sim/systems/economy';
import { BUILDINGS } from '../data/buildings';
import { RULES } from '../data/rules';
import { LAST_WAVE } from '../data/waves';
import { fullDraw } from '../sim/systems/grid';

export interface Spot { b: BuildingId; x: number; y: number; /** don't build before this wave has started */ wave?: number }

export interface BotPlan {
  /** the opening, built before wave 1 */
  opening: Spot[];
  /** towers, nodes and beacons in order */
  wall: Spot[];
  /** generation: an Extractor then the Burner it touches (or a lone Vane) */
  power: Spot[][];
  /** the Lab, Jars: built once `wave` has started, in order, when the wall isn't short of power */
  extras: Spot[];
  research: string[];
  /** which kinds to upgrade once researched, in order of preference */
  upgrades: BuildingId[];
  /** generation the bot keeps above the wall's full firing draw, as a fraction */
  headroom: number;
  /** a slower, plainer player: acts once a second, Overcharges only a cone, a Brazier or a
   *  Starshell, and only on a Pall (the 'human' check in tests/bot.test.ts) */
  human?: boolean;
  /** no verbs at all: no Overcharge, no Pulse, no shedding (the third review's zero-verb control) */
  noVerbs?: boolean;
  /** raise this many towers (the first built from the wall list) to tier 1, and nothing else
   *  beyond what the plan does: the "one T press" player */
  raise?: number;
}

export const BOT_PLAN: BotPlan = {
  opening: [
    // layout A, with its Node at (21, 11): 4.5 tiles from both legs, out of a Shade's 3.5, still
    // covering the bend-A Lamps
    { b: 'extractor', x: 16, y: 19 }, { b: 'burner', x: 16, y: 20 }, { b: 'node', x: 21, y: 11 },
    { b: 'lamp', x: 24, y: 7 }, { b: 'lamp', x: 24, y: 13 },
  ],
  wall: [
    { b: 'lamp', x: 22, y: 16 },
    { b: 'lamp', x: 24, y: 16 },
    { b: 'floodlight', x: 24, y: 10, wave: 3 },
    { b: 'lamp', x: 22, y: 7 },
    { b: 'brazier', x: 22, y: 13, wave: 4 },
    { b: 'lamp', x: 20, y: 7 },
    { b: 'starshell', x: 19, y: 10, wave: 5 },
    { b: 'beacon', x: 18, y: 8 },
    { b: 'node', x: 24, y: 12 },
    { b: 'node', x: 28, y: 12 },
    { b: 'searchlight', x: 27, y: 9, wave: 6 },
    { b: 'lamp', x: 27, y: 13 },
    { b: 'floodlight', x: 27, y: 15 },
    { b: 'starshell', x: 22, y: 11, wave: 7 },
    { b: 'brazier', x: 27, y: 7 },
    { b: 'beacon', x: 29, y: 11 },
    { b: 'lamp', x: 29, y: 13 },
    { b: 'starshell', x: 29, y: 15 },
    { b: 'lamp', x: 29, y: 9 },
    // late: the first straight (a Floodlight looking down it) behind a Node out of Shade reach,
    // and long reach from the far side of bend B
    { b: 'node', x: 17, y: 9 },
    { b: 'brazier', x: 16, y: 7 },
    { b: 'floodlight', x: 14, y: 7 },
    { b: 'searchlight', x: 31, y: 12 },
    { b: 'lamp', x: 12, y: 7 },
    { b: 'starshell', x: 31, y: 9 },
  ],
  power: [
    [{ b: 'extractor', x: 15, y: 19 }, { b: 'burner', x: 13, y: 18 }],
    [{ b: 'extractor', x: 15, y: 11 }, { b: 'burner', x: 13, y: 12 }],
    [{ b: 'extractor', x: 16, y: 18 }, { b: 'burner', x: 17, y: 17 }],
    [{ b: 'extractor', x: 16, y: 10 }, { b: 'burner', x: 17, y: 10 }],
    [{ b: 'extractor', x: 15, y: 10 }, { b: 'burner', x: 13, y: 10 }],
    [{ b: 'vane', x: 14, y: 14 }],
    [{ b: 'vane', x: 24, y: 18 }],
    [{ b: 'vane', x: 14, y: 16 }],
    [{ b: 'vane', x: 22, y: 20 }],
  ],
  extras: [
    { b: 'jar', x: 22, y: 18, wave: 3 },
    { b: 'lab', x: 19, y: 18, wave: 3 },
    { b: 'jar', x: 23, y: 18, wave: 5 },
    { b: 'lab', x: 19, y: 20, wave: 6 },
  ],
  research: ['brazier', 'starshell', 'lamp2', 'bellows', 'vane', 'searchlight', 'flood2', 'brazier2', 'star2', 'bank', 'deepbit', 'search2'],
  upgrades: ['burner', 'lamp', 'floodlight', 'brazier', 'starshell', 'searchlight', 'jar', 'extractor'],
  headroom: 1.8,
};

/** The Switchback: Lamps inside the two bends by the Hearth, the strip between the long legs
 *  reached by Nodes a Shade can cut, generation from the near deposit and the strong wind. */
export const SWITCHBACK_PLAN: BotPlan = {
  opening: [
    { b: 'extractor', x: 23, y: 24 }, { b: 'burner', x: 21, y: 24 }, { b: 'node', x: 16, y: 17 },
    { b: 'lamp', x: 12, y: 19 }, { b: 'lamp', x: 12, y: 13 },
  ],
  wall: [
    { b: 'lamp', x: 12, y: 16 },
    { b: 'lamp', x: 14, y: 19 },
    { b: 'floodlight', x: 14, y: 14, wave: 3 },
    { b: 'node', x: 21, y: 16 },
    { b: 'lamp', x: 17, y: 14 },
    { b: 'brazier', x: 14, y: 22, wave: 4 },
    { b: 'floodlight', x: 23, y: 13 },
    { b: 'node', x: 25, y: 16 },
    { b: 'lamp', x: 28, y: 13 },
    { b: 'starshell', x: 19, y: 15, wave: 5 },
    { b: 'node', x: 16, y: 11 },
    { b: 'searchlight', x: 14, y: 8, wave: 6 },
    { b: 'brazier', x: 12, y: 10 },
    { b: 'lamp', x: 20, y: 13 },
    { b: 'beacon', x: 26, y: 13 },
    { b: 'starshell', x: 23, y: 15 },
    { b: 'searchlight', x: 18, y: 8 },
    { b: 'node', x: 28, y: 15 },
    { b: 'lamp', x: 30, y: 13 },
  ],
  power: [
    [{ b: 'extractor', x: 24, y: 24 }, { b: 'burner', x: 25, y: 22 }],
    [{ b: 'extractor', x: 23, y: 25 }, { b: 'burner', x: 21, y: 26 }],
    [{ b: 'extractor', x: 24, y: 25 }, { b: 'burner', x: 24, y: 26 }],
    [{ b: 'vane', x: 23, y: 18 }],
    [{ b: 'vane', x: 18, y: 26 }],
    [{ b: 'vane', x: 25, y: 19 }],
    [{ b: 'vane', x: 16, y: 24 }],
    [{ b: 'extractor', x: 25, y: 25 }],
    [{ b: 'vane', x: 16, y: 26 }],
    [{ b: 'vane', x: 14, y: 26 }],
  ],
  extras: [
    { b: 'jar', x: 20, y: 24, wave: 3 },
    { b: 'lab', x: 14, y: 24, wave: 3 },
    { b: 'jar', x: 19, y: 24, wave: 5 },
    { b: 'lab', x: 18, y: 18, wave: 6 },
  ],
  research: ['vane', 'brazier', 'starshell', 'lamp2', 'bellows', 'searchlight', 'flood2', 'brazier2', 'star2', 'bank', 'deepbit', 'search2'],
  upgrades: ['burner', 'lamp', 'floodlight', 'brazier', 'starshell', 'searchlight', 'jar', 'extractor'],
  headroom: 1.8,
};

/** Two Roads: the shared last stretch first (on the Hearth's own power), then the junction behind
 *  two Nodes 4.5 tiles from the roads, then each road's last leg; power from the safe south deposit
 *  and three Vanes spread out of each other's wake. */
export const TWO_ROADS_PLAN: BotPlan = {
  opening: [
    { b: 'extractor', x: 18, y: 25 }, { b: 'burner', x: 16, y: 25 },
    { b: 'lamp', x: 16, y: 16 }, { b: 'lamp', x: 19, y: 16 },
  ],
  wall: [
    { b: 'lamp', x: 16, y: 14 },
    { b: 'lamp', x: 19, y: 14 },
    { b: 'node', x: 13, y: 16 },
    { b: 'node', x: 23, y: 16 },
    { b: 'floodlight', x: 16, y: 12, wave: 3 },
    { b: 'brazier', x: 19, y: 12, wave: 4 },
    { b: 'starshell', x: 13, y: 13, wave: 5 },
    { b: 'floodlight', x: 23, y: 12 },
    { b: 'lamp', x: 21, y: 12 },
    { b: 'searchlight', x: 11, y: 13, wave: 6 },
    { b: 'beacon', x: 21, y: 14 },
    { b: 'starshell', x: 25, y: 15 },
    { b: 'searchlight', x: 25, y: 13 },
    { b: 'lamp', x: 9, y: 12 },
    { b: 'starshell', x: 9, y: 15 },
    { b: 'floodlight', x: 21, y: 21 },
    { b: 'lamp', x: 14, y: 18 },
  ],
  power: [
    [{ b: 'extractor', x: 19, y: 25 }, { b: 'burner', x: 20, y: 25 }],
    [{ b: 'extractor', x: 17, y: 24 }, { b: 'burner', x: 15, y: 23 }],
    [{ b: 'extractor', x: 19, y: 24 }, { b: 'burner', x: 20, y: 23 }],
    [{ b: 'extractor', x: 18, y: 24 }],
    [{ b: 'vane', x: 24, y: 20 }],
    [{ b: 'vane', x: 13, y: 24 }],
    [{ b: 'vane', x: 22, y: 26 }],
  ],
  extras: [
    { b: 'jar', x: 21, y: 19, wave: 3 },
    { b: 'lab', x: 22, y: 17, wave: 3 },
    { b: 'jar', x: 21, y: 20, wave: 5 },
    { b: 'lab', x: 13, y: 21, wave: 6 },
  ],
  research: ['brazier', 'starshell', 'lamp2', 'bellows', 'vane', 'searchlight', 'flood2', 'brazier2', 'star2', 'bank', 'deepbit', 'search2'],
  upgrades: ['burner', 'lamp', 'floodlight', 'brazier', 'starshell', 'searchlight', 'jar', 'extractor'],
  headroom: 1.8,
};

/** The Fork: the first Lamps where both branches come down as one, then more light on the Loop's
 *  last leg than on the Cut, so the Moths take the long way round; Nodes 4.5 tiles back from every
 *  road. The bot never baits. */
export const FORK_PLAN: BotPlan = {
  opening: [
    { b: 'extractor', x: 16, y: 25 }, { b: 'burner', x: 16, y: 23 },
    { b: 'lamp', x: 17, y: 17 }, { b: 'lamp', x: 20, y: 17 },
  ],
  wall: [
    { b: 'node', x: 24, y: 20 },
    { b: 'lamp', x: 23, y: 16 },
    { b: 'lamp', x: 25, y: 16 },
    { b: 'node', x: 14, y: 20 },
    { b: 'lamp', x: 14, y: 16 },
    { b: 'floodlight', x: 17, y: 19, wave: 3 },
    { b: 'brazier', x: 20, y: 19, wave: 4 },
    { b: 'lamp', x: 27, y: 16 },
    { b: 'starshell', x: 22, y: 18, wave: 5 },
    { b: 'searchlight', x: 25, y: 18, wave: 6 },
    { b: 'node', x: 28, y: 20 },
    { b: 'floodlight', x: 29, y: 16 },
    { b: 'lamp', x: 12, y: 16 },
    { b: 'beacon', x: 15, y: 18 },
    { b: 'starshell', x: 27, y: 18, wave: 7 },
    { b: 'floodlight', x: 10, y: 16 },
    { b: 'starshell', x: 12, y: 18 },
    { b: 'searchlight', x: 29, y: 18 },
  ],
  power: [
    [{ b: 'extractor', x: 15, y: 25 }, { b: 'burner', x: 13, y: 26 }],
    [{ b: 'extractor', x: 14, y: 24 }, { b: 'burner', x: 12, y: 24 }],
    [{ b: 'extractor', x: 15, y: 24 }],
    [{ b: 'extractor', x: 14, y: 25 }],
    [{ b: 'vane', x: 23, y: 26 }],
    [{ b: 'vane', x: 11, y: 21 }],
    [{ b: 'vane', x: 26, y: 23 }],
    [{ b: 'vane', x: 30, y: 22 }],
  ],
  extras: [
    { b: 'jar', x: 22, y: 22, wave: 3 },
    { b: 'lab', x: 22, y: 24, wave: 3 },
    { b: 'jar', x: 22, y: 23, wave: 5 },
    { b: 'lab', x: 18, y: 26, wave: 6 },
  ],
  research: ['brazier', 'starshell', 'lamp2', 'bellows', 'vane', 'searchlight', 'flood2', 'brazier2', 'star2', 'bank', 'deepbit', 'search2'],
  upgrades: ['burner', 'lamp', 'floodlight', 'brazier', 'starshell', 'searchlight', 'jar', 'extractor'],
  headroom: 1.8,
};

/** the bot's plan for a map */
export function planFor(mapId: string): BotPlan {
  return mapId === 'switchback' ? SWITCHBACK_PLAN : mapId === 'tworoads' ? TWO_ROADS_PLAN : mapId === 'fork' ? FORK_PLAN : BOT_PLAN;
}

export class Bot {
  opened = 0;
  wallI = 0;
  powerI = 0;
  extraI = 0;
  shedLab = true;
  log: string[] = [];

  constructor(public plan: BotPlan = BOT_PLAN, public callEarly = false) {}

  private build(g: Game, s: Spot): boolean {
    const def = BUILDINGS[s.b];
    if (def.research && !g.research.done.has(def.research)) return false;
    if (g.money < def.cost) return false;
    const r = place(g, s.b, s.x, s.y);
    if (typeof r === 'string') this.log.push(`skip ${s.b} ${s.x},${s.y}: ${r}`);
    return true;
  }

  /** kW the wall and works would ask at full fire */
  fullDraw(g: Game, extra = 0): number {
    let d = extra;
    for (const b of g.buildings.values()) if (b.def.role !== 'lab') d += fullDraw(g, b);
    return d;
  }

  /** kW the factory makes (a Vane at its average) */
  generation(g: Game): number {
    let s = 0;
    for (const b of g.buildings.values()) {
      if (b.def.role === 'core') s += g.hearthOutput();
      else if (b.def.role === 'generator') s += (g.spec(b).output ?? 0) * (b.def.fuel === 'wind' ? g.map.windMean * windShade(g, b) : 1);
    }
    return s;
  }

  private drawOf(g: Game, s: Spot | undefined): number {
    if (!s) return 0;
    const d = BUILDINGS[s.b];
    return fullDraw(g, { def: d, level: 1, off: false } as any);
  }

  act(g: Game) {
    if (g.over) return;
    const p = this.plan;
    while (this.opened < p.opening.length && this.build(g, p.opening[this.opened])) this.opened++;
    if (this.opened < p.opening.length) return;
    for (let guard = 0; guard < 8; guard++) {
      const w = p.wall[this.wallI];
      const wReady = w && g.wave >= (w.wave ?? 0) && (!BUILDINGS[w.b].research || g.research.done.has(BUILDINGS[w.b].research!));
      const short = this.fullDraw(g, wReady ? this.drawOf(g, w) : 0) > this.generation(g) * p.headroom;
      const pw = p.power[this.powerI];
      const pwReady = pw && pw.every((s) => !BUILDINGS[s.b].research || g.research.done.has(BUILDINGS[s.b].research!));
      if (short && !pw) {
        // out of places for generation: make what it has burn hotter, else spend on the wall anyway
        if (this.tryUpgrade(g, ['burner', 'extractor', 'jar'])) continue;
      } else if (short && pw) {
        if (!pwReady) {
          // generation is what's missing and the next source isn't researched: upgrade Burners if it can
          if (!this.tryUpgrade(g, ['burner'])) break;
          continue;
        }
        // buy the whole pair or nothing
        const cost = pw.reduce((a, s) => a + BUILDINGS[s.b].cost, 0);
        if (g.money < cost) break;
        for (const s of pw) this.build(g, s);
        this.powerI++;
        continue;
      }
      const ex = p.extras[this.extraI];
      if (ex && g.wave >= (ex.wave ?? 0)) {
        if (!this.build(g, ex)) break;
        this.extraI++;
        continue;
      }
      if (wReady) {
        if (!this.build(g, w)) break;
        this.wallI++;
        continue;
      }
      if (w && g.wave >= (w.wave ?? 0) && BUILDINGS[w.b].research && !g.research.done.has(BUILDINGS[w.b].research!) && !p.research.includes(BUILDINGS[w.b].research!)) {
        this.wallI++; // a tower the plan will never research
        continue;
      }
      if ((this.fullDraw(g, 8) <= this.generation(g) * p.headroom || !pw) && this.tryUpgrade(g, p.upgrades)) continue;
      break;
    }
    // research: the next project in the list whenever no project is running
    if (!g.research.active && [...g.buildings.values()].some((b) => b.def.role === 'lab')) {
      const next = p.research.find((r) => !g.research.done.has(r));
      if (next) startResearch(g, next);
    }
    // T: the first towers of the wall list up to tier 1, served with the Works before the rest
    if (p.raise) {
      let n = 0;
      for (const s of p.wall) {
        if (n >= p.raise) break;
        const b = [...g.buildings.values()].find((x) => x.x === s.x && x.y === s.y && x.def.role === 'tower');
        if (!b) continue;
        if (b.tier !== 1) setTier(g, b, 1);
        n++;
      }
    }
    if (p.noVerbs) {
      if (g.wave === 0) nextWave(g);
      return;
    }
    // the Lab: shed it while the wall is starved, bring it back when the wall is fed
    if (this.shedLab)
      for (const b of g.buildings.values()) {
        if (b.def.role !== 'lab') continue;
        const wallStarved = g.grid.wall.sat < 0.95 && g.enemies.length > 0;
        if (wallStarved && !b.off) toggleOff(g, b);
        else if (b.off && (g.enemies.length === 0 || g.grid.wall.sat >= 1)) toggleOff(g, b);
      }
    // Overcharge: a tower on a Pall, a late healthy Shade or Snuffer, or a crowd close to the Hearth;
    // a cone, a Brazier or a Starshell before a narrow beam (a Pall drinks most of a beam)
    let pick: Building | undefined;
    let pickT: string | undefined;
    const close = g.enemies.filter((e) => g.left(e) < 8).length;
    for (const b of g.buildings.values()) {
      if (b.def.role !== 'tower' || b.target < 0 || overchargeProblem(g, b)) continue;
      const t = g.enemyById(b.target);
      if (!t) continue;
      const heavyLate = (t.def.id === 'shade' || t.def.id === 'snuffer' || t.def.id === 'veil') && g.left(t) < 14 && t.hp > 40;
      if (this.plan.human ? t.def.id === 'pall' && b.def.kind !== 'beam' : t.def.id === 'pall' || heavyLate || (close >= 3 && b.def.kind !== 'beam') || close >= 5) {
        if (!pick || (pick.def.kind === 'beam' && b.def.kind !== 'beam')) {
          pick = b;
          pickT = t.def.id;
        }
        if (b.def.kind !== 'beam') break;
      }
    }
    // an Overcharge is paid from spare power, then from the rest of the wall (Jars never pay for it):
    // the bot spends the wall on a Pall, and otherwise only what is spare
    if (pick) {
      const n = g.networkOf(pick)!;
      const extra = (RULES.overchargeMult.v - 1) * fullDraw(g, pick);
      // a narrow beam on a Pall wastes three quarters of the wall it takes (§5)
      if (pickT === 'pall' ? pick.def.kind !== 'beam' && g.left(g.enemyById(pick.target)!) < 16 : n.wasted + n.charged >= extra * 0.75) overcharge(g, pick);
    }
    // Pulse: when the Jars are mostly full and a crowd (or a Pall) is inside the flashes
    if (g.research.done.has('pulse') && g.grid.stored >= g.grid.capacity * 0.6 && !pulseProblem(g)) {
      const lit = [...g.buildings.values()].filter((b) => b.def.role === 'tower' && !b.off && b.sat > 0);
      const inFlash = g.enemies.filter((e) => lit.some((t) => Math.hypot(e.x - t.x - t.def.size / 2, e.y - t.y - t.def.size / 2) <= RULES.pulseRadius.v));
      if (inFlash.length >= 8 || inFlash.some((e) => e.def.id === 'pall' && g.left(e) < 10)) pulse(g);
    }
    // waves: start wave 1 once the opening is built; later waves come on the breather, or
    // sooner (callEarly) once the field is clear after a clean wave
    if (g.wave === 0) nextWave(g);
    else if (this.callEarly && g.wave < LAST_WAVE && g.waveTimer > 0 && (g.stats.leaksByWave[g.wave] ?? 0) === 0) nextWave(g);
  }

  /** upgrade the first building of the listed kinds the research allows; true if it did */
  private tryUpgrade(g: Game, kinds: BuildingId[]): boolean {
    for (const k of kinds) {
      const b = [...g.buildings.values()].find((x) => x.def.id === k && !upgradeProblem(g, x));
      if (b) {
        upgrade(g, b);
        return true;
      }
    }
    return false;
  }
}

/** play a whole run headlessly; returns the final game */
export function playRun(g: Game, bot = new Bot(), maxSeconds = 1800): Game {
  for (let t = 0; t < maxSeconds * 60 && !g.over; t++) {
    if (t % (bot.plan.human ? 60 : 6) === 0) bot.act(g);
    g.step();
    g.drainEvents();
  }
  return g;
}
