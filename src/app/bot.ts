// A scripted player for balance checks and screenshots (pure: no DOM). It keeps the wall's
// full-fire draw within its generation (buying Extractor + Burner pairs, later Vanes, when it
// isn't), builds towers from a list of spots, gets Jars and a Lab going, researches down a list,
// upgrades what its research allows, sheds the Lab while the wall is starved, and Overcharges at
// Palls, late Shades and crowds near the Hearth. Positions are top-left tiles on SLICE_MAP.
import type { BuildingId } from '../data/buildings';
import type { Game } from '../sim/Game';
import { nextWave, overcharge, overchargeProblem, place, startResearch, toggleOff, upgrade, upgradeProblem } from '../sim/actions';
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
}

export const BOT_PLAN: BotPlan = {
  opening: [
    // layout A, with its Node at (21, 10): out of a Shade's reach, still covering the bend-A Lamp
    { b: 'extractor', x: 16, y: 19 }, { b: 'burner', x: 16, y: 20 }, { b: 'node', x: 21, y: 10 },
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
      else if (b.def.role === 'generator') s += (g.spec(b).output ?? 0) * (b.def.fuel === 'wind' ? RULES.windMean.v : 1);
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
    // the Lab: shed it while the wall is starved, bring it back when the wall is fed
    if (this.shedLab)
      for (const b of g.buildings.values()) {
        if (b.def.role !== 'lab') continue;
        const wallStarved = g.grid.wall.sat < 0.95 && g.enemies.length > 0;
        if (wallStarved && !b.off) toggleOff(g, b);
        else if (b.off && (g.enemies.length === 0 || g.grid.wall.sat >= 1)) toggleOff(g, b);
      }
    // Overcharge: a tower on a Pall, a late healthy Shade or Snuffer, or a crowd close to the Hearth
    for (const b of g.buildings.values()) {
      if (b.def.role !== 'tower' || b.target < 0 || overchargeProblem(g, b)) continue;
      const t = g.enemyById(b.target);
      if (!t) continue;
      const close = g.enemies.filter((e) => e.dist > g.path.length - 8).length;
      const heavyLate = (t.def.id === 'shade' || t.def.id === 'snuffer' || t.def.id === 'veil') && t.dist > g.path.length - 14 && t.hp > 40;
      if (t.def.id === 'pall' || heavyLate || (close >= 3 && b.def.kind !== 'beam') || close >= 5) {
        overcharge(g, b);
        break;
      }
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
    if (t % 6 === 0) bot.act(g);
    g.step();
    g.drainEvents();
  }
  return g;
}
