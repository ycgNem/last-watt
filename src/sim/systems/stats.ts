// Run end: the station loses when its lights run out (§5).
import type { Game } from '../Game';

export function statsSystem(g: Game) {
  if (g.lights <= 0 && !g.over) {
    g.over = 'lose';
    g.emit({ t: 'lose' });
  }
}
