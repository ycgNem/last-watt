// The sixth review's check (the critic's script): the Switchback's FIRST STEPS layout through wave 1, five
// seeds, two waits, three spots for the second Lamp. It must leak nothing.
import { Game } from '../src/sim/Game';
import { mapById } from '../src/data/map';
import { run } from '../src/sim/commands';
for (const seed of [1, 7, 42, 301, 999]) for (const wait of [9, 20]) for (const second of [[12, 13], [12, 16], [14, 19]]) {
  const g = new Game({ map: mapById('switchback'), seed });
  for (const [id, x, y] of [['extractor', 23, 24], ['burner', 21, 24], ['node', 16, 17], ['lamp', 12, 19], ['lamp', second[0], second[1]]] as const) run(g, { k: 'place', id, x, y });
  for (let i = 0; i < wait * 60; i++) g.step();
  run(g, { k: 'wave' });
  while (!g.wavePaid.has(1) && !g.over) { g.step(); g.drainEvents(); }
  process.stdout.write(`seed ${seed} wait ${wait} second lamp ${second}: leaks ${g.stats.leaks}  |  `);
}
console.log();
