// The guided first run (ROADMAP M10, brought forward at the owner's request): a short list of
// steps on the real map, each with a suggested spot, the build-bar slot to press, and a check on
// the game state that moves it on. The run carries on as a normal run when the steps run out.
import type { BuildingId } from '../data/buildings';
import type { Game } from '../sim/Game';
import { touches } from '../sim/geom';

export interface Step {
  title: string;
  text: string;
  /** a suggested footprint to place on (top-left tile, size) */
  spot?: { x: number; y: number; size: number };
  /** the build-bar slot to light up */
  slot?: BuildingId;
  /** the step is done (no NEXT button when this exists, unless `next` is set too) */
  done?: (g: Game) => boolean;
  /** show a NEXT button */
  next?: boolean;
  /** pause the game while this step shows (it waits for the player to read) */
  hold?: boolean;
}

const count = (g: Game, id: BuildingId) => [...g.buildings.values()].filter((b) => b.def.id === id).length;

export const STEPS: Step[] = [
  {
    title: 'THE LAST LIGHT',
    text: 'You run the lights of the last lit station. Things come out of the dark along the ash path and walk to the Hearth (the big light). Each one that reaches it costs lights; at 0 the run ends. Your towers are lamps, and lamps run on watts.',
    next: true,
  },
  {
    title: 'A LAMP',
    text: 'Pick the LAMP (key 1, bottom left) and place it inside the bend, on the gold square. Inside a bend it reaches the path on two sides, so enemies stay in its light longer.',
    spot: { x: 24, y: 13, size: 2 }, slot: 'lamp',
    done: (g) => count(g, 'lamp') >= 1,
  },
  {
    title: 'WATTS',
    text: 'A Lamp asks 12 kW while it fires. The Hearth makes only 8 kW (SUPPLY, top bar). Power comes from emberrock, the glowing red rock. Pick an EXTRACTOR (key 8) and place it on the rock at the gold square.',
    spot: { x: 16, y: 19, size: 1 }, slot: 'extractor',
    done: (g) => count(g, 'extractor') >= 1,
  },
  {
    title: 'A BURNER',
    text: 'The Extractor digs rock and hands it to a BURNER (key 9) that touches it. Place one on the gold square: +20 kW while it has rock.',
    spot: { x: 16, y: 20, size: 2 }, slot: 'burner',
    done: (g) => [...g.buildings.values()].some((b) => b.def.id === 'burner' && [...g.buildings.values()].some((x) => x.def.id === 'extractor' && touches(g.rect(x), g.rect(b)))),
  },
  {
    title: 'CARRY THE POWER',
    text: 'Power only reaches the lit ground around the Hearth and its Nodes. A NODE (key 7) carries it 4 tiles further. Place one on the gold square, out of reach of the path (Shades cut Nodes near it).',
    spot: { x: 21, y: 10, size: 1 }, slot: 'node',
    done: (g) => count(g, 'node') >= 1,
  },
  {
    title: 'THE OTHER BEND',
    text: 'Now a second LAMP inside the first bend, on the gold square.',
    spot: { x: 24, y: 7, size: 2 }, slot: 'lamp',
    done: (g) => count(g, 'lamp') >= 2,
  },
  {
    title: 'SHARE OF POWER',
    text: 'You make 28 kW; two firing Lamps ask 24. If towers ask for more than you make, EVERY tower fires slower together (a brownout: the WALL bar at the top turns purple). So each new tower needs Burners behind it. Press SPACE (or the START button, top right) for wave 1.',
    done: (g) => g.wave >= 1,
  },
  {
    title: 'WAVE 1',
    text: 'Moths walk toward the light. Each Lamp beams the one nearest the Hearth. Hover any building to see its power. F speeds the game up; P pauses.',
    done: (g) => g.wavePaid.has(1),
  },
  {
    title: 'PAY AND STORAGE',
    text: 'Clearing a wave pays (15 + 5 × the wave), and every kill pays bounty. Spare power is wasted unless you store it: a JAR (key -) charges from it. With a charged Jar, select a tower and press E to OVERCHARGE it: 3× damage for 4 s.',
    slot: 'jar', next: true, hold: true,
  },
  {
    title: 'RESEARCH',
    text: 'A LAB (key =) turns spare power into research: Searchlights, Braziers, Starshells, wind Vanes and tier-2 upgrades. Press L for the research board. Labs sit on tier 3, so they starve before your towers do.',
    slot: 'lab', next: true, hold: true,
  },
  {
    title: 'YOU HAVE THE LIGHTS',
    text: 'Shades cut Nodes, Snuffers put out Burners, Veils hide when your wall is starved, Palls drink thin beams. A card tells you about each one when it first comes. Keep the watts flowing. H shows every key.',
    next: true, hold: true,
  },
];

export class Tutorial {
  i = 0;
  finished = false;

  get step(): Step | undefined {
    return this.finished ? undefined : STEPS[this.i];
  }

  /** move on when the current step's check passes */
  update(g: Game) {
    const s = this.step;
    if (!s || !s.done) return;
    if (s.done(g)) this.advance();
  }

  advance() {
    this.i++;
    if (this.i >= STEPS.length) this.finished = true;
  }

  skip() {
    this.finished = true;
  }
}
