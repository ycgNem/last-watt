// Each wave's kJ and inflow (kJ/s) at the station pace: the numbers DESIGN.md §5 quotes.
import { WAVES, seqHealth } from '../src/data/waves';
for (const w of WAVES) console.log(`wave ${w.n}: ${seqHealth(w.seq)} kJ, ${w.seq.length} spawns, ${w.spacing} s → ${(seqHealth(w.seq) / (w.seq.length * w.spacing)).toFixed(1)} kJ/s`);
