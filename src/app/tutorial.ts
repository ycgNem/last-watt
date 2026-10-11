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
    spot: { x: 16, y: 18, size: 1 }, slot: 'extractor',
    done: (g) => count(g, 'extractor') >= 1,
  },
  {
    title: 'A BURNER',
    text: 'The Extractor digs rock and hands it to a BURNER (key 9) that touches it. Place one on the gold square: +20 kW while it has rock.',
    spot: { x: 16, y: 16, size: 2 }, slot: 'burner',
    done: (g) => [...g.buildings.values()].some((b) => b.def.id === 'burner' && [...g.buildings.values()].some((x) => x.def.id === 'extractor' && touches(g.rect(x), g.rect(b)))),
  },
  {
    title: 'CARRY THE POWER',
    text: 'Power only reaches the lit ground around the Hearth and its Nodes. A NODE (key 7) carries it 4 tiles further. Place one on the gold square, out of the red: a Shade walking by cuts any Node in it.',
    spot: { x: 21, y: 11, size: 1 }, slot: 'node',
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
    text: 'Once the Burner has its first rock (about 8 s) you make 28 kW: 8 from the Hearth, 20 from the Burner (SUPPLY, top). A Lamp asks 12 kW only while it fires, so two firing ask 24. Hover the LAMP slot: the forecast says what one more would do. SPACE starts wave 1.',
    done: (g) => g.wave >= 1,
  },
  {
    title: 'WAVE 1',
    text: 'Moths walk toward the light. Each Lamp beams the one nearest the Hearth. Hover any building to see its power. F speeds the game up; P pauses.',
    done: (g) => g.wavePaid.has(1),
  },
  {
    title: 'A THIRD LAMP',
    text: 'Wave 2 brings 12 Moths, closer together; two Lamps cannot keep up. Put a third on the gold spot. Three firing ask 36 kW of your 28, so each fires at about three quarters. Weaker, not broken.',
    spot: { x: 22, y: 16, size: 2 }, slot: 'lamp',
    done: (g) => count(g, 'lamp') >= 3,
  },
  {
    title: 'WATCH THE WALL',
    text: 'When all three fire, the WALL bar (top) dips below 100%. Below 60% it turns violet and your towers flicker: a brownout (you will see one if you Overcharge with nothing spare). More Burners fix it, and so does a Jar.',
    done: (g) => g.wavePaid.has(2),
  },
  {
    title: 'A JAR',
    text: 'Spare power is WASTED (top) unless you store it. Build a JAR (key -) on the gold spot. It charges from spare power in the breather and pays back in a pinch.',
    spot: { x: 22, y: 19, size: 1 }, slot: 'jar',
    done: (g) => count(g, 'jar') >= 1,
  },
  {
    title: 'OVERCHARGE',
    text: 'Wave 3 brings two Shades (90 kJ each). When one walks into a Lamp, hover that Lamp and press E: for 4 s it asks 3x its watts ahead of everything else, even your Extractors, and fires 3x as hard. The extra comes from spare power, then from your other towers: watch them dim. Jars don\'t pay for it; they hold the wall.',
    // done once the burst is over, so the player sees what it did before the next card holds the game
    done: (g) => g.stats.overcharges >= 1 && ![...g.buildings.values()].some((b) => b.overcharge > 0),
  },
  // the fourth review (M1): the graduate walked into wave 4 with 155 money unspent and lost 13
  // lights; a Burner pair and a fourth Lamp between waves 3 and 4 lose none
  {
    title: 'MORE WATTS',
    text: 'Wave 4 brings eight Flits and three Shades: more than three Lamps on one Burner can answer. Spend between waves; money in the bank lights nothing. First a second EXTRACTOR (key 8) on the rock at the gold square.',
    spot: { x: 15, y: 19, size: 1 }, slot: 'extractor',
    done: (g) => count(g, 'extractor') >= 2,
  },
  {
    title: 'ITS BURNER',
    text: 'And a BURNER (key 9) touching it, on the gold square: another 20 kW once its first rock is in.',
    spot: { x: 13, y: 18, size: 2 }, slot: 'burner',
    done: (g) => count(g, 'burner') >= 2,
  },
  {
    title: 'A FOURTH LAMP',
    text: 'Flits are quick and come in clumps: more beams, not stronger ones. A fourth LAMP on the gold square, beside the third.',
    spot: { x: 24, y: 16, size: 2 }, slot: 'lamp',
    done: (g) => count(g, 'lamp') >= 4,
  },
  {
    title: 'A LAB',
    text: 'A LAB (key =) turns spare power into research: new towers, wind Vanes, upgrades. It asks 10 kW while it works and sits on tier 3, so it starves before your towers do. Place one on the gold square.',
    spot: { x: 19, y: 18, size: 2 }, slot: 'lab',
    done: (g) => count(g, 'lab') >= 1,
  },
  {
    title: 'THE BRAZIER',
    text: 'Press L for the research board and click BRAZIER: fire that burns everything within 2.5 tiles, the answer to a clump of Flits. The Lab works on it through the next wave; build one where the road bends when it is done.',
    done: (g) => g.research.active === 'brazier' || g.research.queue.includes('brazier') || g.research.done.has('brazier'),
  },
  {
    title: 'YOU HAVE THE LIGHTS',
    text: 'Shades cut Nodes, Snuffers put out Burners, Veils hide when your wall is starved, Palls drink thin beams. A card tells you about each one when it first comes. Floodlights work best where enemies line up: the outside of a bend. Spend each wave\'s pay before the next. H shows every key.',
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
