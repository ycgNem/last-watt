// A scripted player for balance checks and screenshots (pure: no DOM). It keeps the wall's
// firing draw within its generation (buying Extractor + Burner pairs when it isn't), builds
// towers from a list of spots, gets a Lab and a Jar going once the wall can spare the money,
// sheds the Lab while the wall is starved, and Overcharges at Palls and at crowds near the
// Hearth. Positions are top-left tiles on SLICE_MAP.
import type { BuildingId } from '../data/buildings';
import type { Game } from '../sim/Game';
import { nextWave, overcharge, overchargeProblem, place, setTier, startResearch, toggleOff, upgrade, upgradeProblem } from '../sim/actions';
import { BUILDINGS } from '../data/buildings';

export interface Spot { b: BuildingId; x: number; y: number; /** don't build before this wave has started */ wave?: number }

export interface BotPlan {
  /** the opening, built before wave 1 */
  opening: Spot[];
  /** towers, nodes and beacons in order */
  wall: Spot[];
  /** generation: an Extractor then the Burner it touches (or a lone Extractor feeding an existing Burner) */
  power: Spot[][];
  /** the Lab, Jars: built once `wave` has started, in order, when the wall isn't short of power */
  extras: Spot[];
  research: string[];
  upgradeLamps: boolean;
  /** generation the bot keeps above the wall's full firing draw, as a fraction */
  headroom: number;
}

export const BOT_PLAN: BotPlan = {
  opening: [
    { b: 'extractor', x: 16, y: 19 }, { b: 'burner', x: 16, y: 20 }, { b: 'node', x: 23, y: 10 },
    { b: 'lamp', x: 24, y: 7 }, { b: 'lamp', x: 24, y: 13 },
  ],
  wall: [
    { b: 'lamp', x: 22, y: 16 },
    { b: 'lamp', x: 24, y: 16 },
    { b: 'floodlight', x: 24, y: 10, wave: 3 },
    { b: 'lamp', x: 22, y: 7 },
    { b: 'lamp', x: 20, y: 7 },
    { b: 'beacon', x: 20, y: 9 },
    { b: 'lamp', x: 18, y: 7 },
    { b: 'node', x: 24, y: 12 },
    { b: 'node', x: 28, y: 12 },
    { b: 'floodlight', x: 27, y: 9 },
    { b: 'lamp', x: 27, y: 13 },
    { b: 'lamp', x: 27, y: 16 },
  ],
  power: [
    [{ b: 'extractor', x: 15, y: 19 }, { b: 'burner', x: 13, y: 18 }],
    [{ b: 'extractor', x: 16, y: 10 }, { b: 'burner', x: 17, y: 10 }],
    [{ b: 'extractor', x: 15, y: 10 }, { b: 'burner', x: 13, y: 10 }],
    [{ b: 'extractor', x: 16, y: 18 }, { b: 'burner', x: 17, y: 16 }],
    [{ b: 'extractor', x: 15, y: 11 }, { b: 'burner', x: 13, y: 12 }],
  ],
  extras: [
    { b: 'lab', x: 19, y: 18, wave: 3 },
    { b: 'jar', x: 22, y: 18, wave: 4 },
    { b: 'jar', x: 23, y: 18, wave: 6 },
  ],
  research: ['jar', 'lamp2'],
  upgradeLamps: true,
  headroom: 1.5,
};

export class Bot {
  opened = 0;
  wallI = 0;
  powerI = 0;
  extraI = 0;
  shedLab = false;
  /** a player who has learned the brownout spiral: Extractors on tier 1 so the Burners never starve */
  extractorsFirst = true;
  log: string[] = [];

  constructor(public plan: BotPlan = BOT_PLAN, public callEarly = true) {}

  private build(g: Game, s: Spot): boolean {
    if (g.money < BUILDINGS[s.b].cost) return false;
    const r = place(g, s.b, s.x, s.y);
    if (typeof r === 'string') this.log.push(`skip ${s.b} ${s.x},${s.y}: ${r}`);
    else if (this.extractorsFirst && r.def.role === 'extractor') setTier(g, r, 1);
    return true;
  }

  /** kW the wall and works would ask with every tower firing */
  fullDraw(g: Game, extra = 0): number {
    let d = extra;
    for (const b of g.buildings.values()) {
      if (b.off) continue;
      const def = b.def;
      if (def.role === 'tower') d += g.towerStats(b).firingDraw;
      else if (def.role === 'beacon') d += def.constantDraw ?? 0;
      else if (def.role === 'extractor') d += def.workDraw ?? 0;
    }
    return d;
  }

  generation(g: Game): number {
    let s = 0;
    for (const b of g.buildings.values()) if (b.def.role === 'core' || b.def.role === 'generator') s += b.def.output ?? 0;
    return s;
  }

  act(g: Game) {
    if (g.over) return;
    const p = this.plan;
    while (this.opened < p.opening.length && this.build(g, p.opening[this.opened])) this.opened++;
    if (this.opened < p.opening.length) return;
    for (let guard = 0; guard < 6; guard++) {
      const w = p.wall[this.wallI];
      const wDraw = w ? (BUILDINGS[w.b].firingDraw ?? BUILDINGS[w.b].constantDraw ?? 0) : 0;
      const short = this.fullDraw(g, wDraw) > this.generation(g) * p.headroom;
      const pw = p.power[this.powerI];
      if (short && pw) {
        // buy the whole pair or nothing
        const cost = pw.reduce((a, s) => a + BUILDINGS[s.b].cost, 0);
        if (g.money < cost) break;
        for (const s of pw) this.build(g, s);
        this.powerI++;
        continue;
      }
      const ex = p.extras[this.extraI];
      if (ex && g.wave >= (ex.wave ?? 0) && (!w || g.wave >= (w.wave ?? 0) || ex.wave! <= g.wave)) {
        if (BUILDINGS[ex.b].research && !g.research.done.has(BUILDINGS[ex.b].research!)) {
          // can't build it yet; fall through to the wall
        } else {
          if (!this.build(g, ex)) break;
          this.extraI++;
          continue;
        }
      }
      if (w && g.wave >= (w.wave ?? 0)) {
        if (!this.build(g, w)) break;
        this.wallI++;
        continue;
      }
      if (p.upgradeLamps && g.research.done.has('lamp2')) {
        const lamp = [...g.buildings.values()].find((b) => b.def.id === 'lamp' && !upgradeProblem(g, b));
        if (lamp && this.fullDraw(g, 6) <= this.generation(g) * p.headroom) {
          upgrade(g, lamp);
          continue;
        }
      }
      break;
    }
    // research: the next project in the list whenever no project is running
    if (!g.research.active && [...g.buildings.values()].some((b) => b.def.role === 'lab')) {
      const next = p.research.find((r) => !g.research.done.has(r));
      if (next) startResearch(g, next);
    }
    // the Lab: shed it while the wall is starved, bring it back when the field is clear
    if (this.shedLab)
      for (const b of g.buildings.values()) {
        if (b.def.role !== 'lab') continue;
        const wallStarved = g.grid.tiers[1].sat < 0.95 && g.enemies.length > 0;
        if (wallStarved && !b.off) toggleOff(g, b);
        else if (b.off && g.enemies.length === 0) toggleOff(g, b);
      }
    // Overcharge: a tower lighting a Pall, or a crowd close to the Hearth
    for (const b of g.buildings.values()) {
      if (b.def.role !== 'tower' || b.target < 0 || overchargeProblem(g, b)) continue;
      const t = g.enemyById(b.target);
      if (!t) continue;
      const close = g.enemies.filter((e) => e.dist > g.path.length - 8).length;
      if (t.def.id === 'pall' || (close >= 3 && b.def.id === 'floodlight') || close >= 5) {
        overcharge(g, b);
        break;
      }
    }
    // waves: start wave 1 once the opening is built; call early only after a clean wave
    if (g.wave === 0) nextWave(g);
    else if (this.callEarly && g.wave < 8 && g.enemies.length === 0 && g.spawners.length === 0) {
      const clean = (g.stats.leaksByWave[g.wave] ?? 0) === 0;
      if (clean && g.waveTimer < 45 - 15) nextWave(g);
    }
  }
}

/** play a whole run headlessly; returns the final game */
export function playRun(g: Game, bot = new Bot(), maxSeconds = 1200): Game {
  for (let t = 0; t < maxSeconds * 60 && !g.over; t++) {
    if (t % 6 === 0) bot.act(g);
    g.step();
    g.drainEvents();
  }
  return g;
}
