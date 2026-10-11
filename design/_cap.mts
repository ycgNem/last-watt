// capacity variants: Node carryKw and Busbar carryKw from argv, the bar on every map
import { BUILDINGS } from '../src/data/buildings';
const [plain, bus] = (process.argv[2] ?? '60,120').split(',').map(Number);
(BUILDINGS.node as any).carryKw = plain;
(BUILDINGS.node.upgrades![0].alts![0].stats as any).carryKw = bus;
process.argv[2] = 'station,switchback,fork,tworoads';
await import('./verbs.mts');
