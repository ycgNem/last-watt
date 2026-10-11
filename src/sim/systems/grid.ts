// The grid, once per tick, before any consumer acts (DESIGN.md §2):
// networks from nodes, supply, line losses, priority tiers, satisfaction, Jar charge/discharge,
// wasted kW. Consumers read b.sat afterwards; they never compute it.
import { RULES } from '../../data/rules';
import { SKILL_RULES } from '../../data/skills';
import { DT, emptyTiers, type Game } from '../Game';
import { covers } from '../geom';
import type { Building, Network } from '../types';
import { allocate, buildTree } from './flow';

/** the order tiers are served in: the Works, Overcharges, the Wall, the Labs (DESIGN.md §2.3) */
const ORDER = [1, 0, 2, 3];

/** a node-like building carries power: the Hearth always, a Node unless knocked out */
function conducts(b: Building) {
  return b.def.role === 'core' || (b.def.role === 'node' && b.offline <= 0);
}

/** rebuild which network every building is on (§2.5); only when something changed */
export function rebuildNetworks(g: Game) {
  const all = [...g.buildings.values()];
  const parent = new Map<number, number>();
  const find = (a: number): number => {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = a;
    while (parent.get(c) !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const b of all) parent.set(b.id, b.id);
  const cond = all.filter(conducts);
  const reach = (b: Building) => g.spec(b).nodeRadius ?? 0;
  const links: [Building, Building][] = [];
  for (let i = 0; i < cond.length; i++)
    for (let j = i + 1; j < cond.length; j++) {
      const a = cond[i], b = cond[j];
      if (covers(g.rect(a), reach(a), g.rect(b)) || covers(g.rect(b), reach(b), g.rect(a))) {
        union(a.id, b.id);
        links.push([a, b]);
      }
    }
  const covered = new Set<number>();
  const coveredBy = new Map<number, Building[]>();
  for (const b of all) {
    if (conducts(b)) continue;
    for (const c of cond) {
      if (covers(g.rect(c), reach(c), g.rect(b))) {
        union(b.id, c.id);
        covered.add(b.id);
        if (!coveredBy.has(b.id)) coveredBy.set(b.id, []);
        coveredBy.get(b.id)!.push(c);
      }
    }
  }
  const index = new Map<number, number>();
  const nets: Network[] = [];
  for (const c of cond) {
    const r = find(c.id);
    if (!index.has(r)) {
      index.set(r, nets.length);
      nets.push({
        id: nets.length, nodes: [], members: [], gen: 0, loss: 0, demand: 0, discharge: 0, charged: 0, wasted: 0,
        stored: 0, capacity: 0, tiers: emptyTiers(), wall: { demand: 0, served: 0, sat: 1 }, hasHearth: false, drain: 0, stolen: 0,
      });
    }
    const n = nets[index.get(r)!];
    n.nodes.push(c.id);
    if (c.def.role === 'core') n.hasHearth = true;
  }
  for (const b of all) {
    const on = conducts(b) || covered.has(b.id);
    b.net = on ? index.get(find(b.id)) ?? -1 : -1;
    if (b.net >= 0) nets[b.net].members.push(b.id);
    b.carry = 0;
    b.full = false;
  }
  // each network's conductors as a tree from its root (the Hearth, else the conductor feeding the
  // most generators), and the conductor each member draws through: the one nearest the root that
  // covers it, then the nearest (§3.3)
  for (const n of nets) {
    const ids = n.nodes;
    const pos = new Map(ids.map((id, i) => [id, i]));
    const adj: number[][] = ids.map(() => []);
    for (const [a, b] of links) {
      const i = pos.get(a.id), j = pos.get(b.id);
      if (i === undefined || j === undefined) continue;
      adj[i].push(j);
      adj[j].push(i);
    }
    let root = ids.findIndex((id) => g.buildings.get(id)!.def.role === 'core');
    if (root < 0) {
      let most = -1;
      ids.forEach((id, i) => {
        const c = g.buildings.get(id)!;
        const feeds = n.members.filter((m) => g.buildings.get(m)!.def.role === 'generator' && coveredBy.get(m)?.includes(c)).length;
        if (feeds > most) {
          most = feeds;
          root = i;
        }
      });
    }
    const tree = buildTree(ids, adj, Math.max(0, root), (i) => {
      const c = g.buildings.get(ids[i])!;
      return c.def.role === 'core' ? Infinity : g.spec(c).carryKw ?? Infinity;
    });
    const depth = new Array<number>(tree.ids.length).fill(0);
    for (let i = 1; i < tree.ids.length; i++) depth[i] = depth[tree.parent[i]] + 1;
    const ti = new Map(tree.ids.map((id, i) => [id, i]));
    const at = new Map<number, number>();
    for (const id of n.members) {
      if (ti.has(id)) {
        at.set(id, ti.get(id)!);
        continue;
      }
      const b = g.buildings.get(id)!;
      const bx = b.x + b.def.size / 2, by = b.y + b.def.size / 2;
      let best = 0, bestKey = Infinity;
      for (const c of coveredBy.get(id) ?? []) {
        const i = ti.get(c.id);
        if (i === undefined) continue;
        const d = Math.hypot(c.x + c.def.size / 2 - bx, c.y + c.def.size / 2 - by);
        const key = depth[i] * 1000 + d;
        if (key < bestKey) {
          bestKey = key;
          best = i;
        }
      }
      at.set(id, best);
    }
    n.tree = tree;
    n.at = at;
  }
  g.networks = nets;
  g.netDirty = false;
  g.netVersion++;
}

/** kW a consumer asks for this tick (0 for non-consumers, shed buildings and shed tiers) */
export function demandOf(g: Game, b: Building): number {
  if (b.off || g.tierOff[b.tier]) return 0;
  const d = g.spec(b);
  switch (d.role) {
    case 'tower': {
      // an Overcharge asks 3× whatever the tower would ask, after the Works and ahead of the wall (§8)
      const k = b.overcharge > 0 ? ocMult(g) : 1;
      switch (d.kind) {
        case 'radial': return k * ((d.idleDraw ?? 0) + (d.perEnemyDraw ?? 0) * b.bodies);
        case 'mortar': return b.shell < (d.shellSize ?? 0) * (d.magazine ?? 1) ? k * (d.chargeDraw ?? 0) : 0;
        default: return k * (b.target >= 0 && b.sweep <= 0 ? d.firingDraw ?? 0 : d.idleDraw ?? 0);
      }
    }
    case 'beacon':
      return d.constantDraw ?? 0;
    case 'extractor':
      return b.stock < (d.stockCap ?? 1) ? d.workDraw ?? 0 : 0;
    case 'lab':
      return g.research.active ? d.workDraw ?? 0 : 0;
    default:
      return 0;
  }
}

/** an Overcharge's multiple on a tower's draw (Cool Glass lowers it, §9) */
export function ocMult(g: Game): number {
  return g.skills.has('coolGlass') ? SKILL_RULES.coolGlass.v : RULES.overchargeMult.v;
}

/** kW a consumer would ask at its busiest (every tower firing, a Brazier with three bodies) */
export function fullDraw(g: Game, b: Building): number {
  if (b.off) return 0;
  const d = g.spec(b);
  switch (d.role) {
    case 'tower':
      // a Brazier is budgeted at a crowd of three; the forecast names its worst case (maxBodies)
      if (d.kind === 'radial') return (d.idleDraw ?? 0) + (d.perEnemyDraw ?? 0) * 3;
      if (d.kind === 'mortar') return d.chargeDraw ?? 0;
      return d.firingDraw ?? 0;
    case 'beacon': return d.constantDraw ?? 0;
    case 'extractor': return d.workDraw ?? 0;
    case 'lab': return g.research.active ? d.workDraw ?? 0 : 0;
    default: return 0;
  }
}

/** the tier a consumer is served in this tick: 0 while Overcharged (ahead of Works) */
function tierOf(b: Building): number {
  return b.overcharge > 0 ? 0 : b.tier;
}

export function isConsumer(b: Building) {
  const r = b.def.role;
  return r === 'tower' || r === 'beacon' || r === 'extractor' || r === 'lab';
}

/** one tick of the grid. `dry`: allocate only (no clocks, no Jar flow, no stats), for showing
 *  the true state of what was just built while the sim is paused or held */
export function gridSystem(g: Game, dry = false) {
  // nodes come back online
  for (const b of g.buildings.values()) {
    if (!dry && b.offline > 0) {
      b.offline -= DT;
      if (b.offline <= 0) {
        b.offline = 0;
        g.netDirty = true;
        g.emit({ t: 'restore', id: b.id });
      }
    }
  }
  if (g.netDirty) rebuildNetworks(g);

  const total = { gen: 0, demand: 0, supply: 0, wasted: 0, stored: 0, capacity: 0, tiers: emptyTiers(), wall: { demand: 0, served: 0, sat: 1 }, peak: 0, stolen: 0, held: 0 };
  for (const b of g.buildings.values()) {
    if (b.net < 0) {
      b.demand = 0;
      b.sat = 0;
      b.flow = 0;
      if (b.def.role === 'generator') b.output = 0;
    }
  }
  // Siphons ask their kW of the building they tap, before any consumer (§5.1)
  const drains = new Map<number, number>();
  for (const e of g.enemies) {
    if (!e.tap || !e.def.drainKw) continue;
    const b = g.buildings.get(e.tap);
    if (b && b.net >= 0) drains.set(b.id, (drains.get(b.id) ?? 0) + e.def.drainKw);
  }
  let stolen = 0;
  for (const n of g.networks) {
    n.drain = 0;
    n.stolen = 0;
    n.tiers = emptyTiers();
    n.gen = 0;
    n.loss = 0;
    n.demand = 0;
    n.discharge = 0;
    n.charged = 0;
    n.wasted = 0;
    n.stored = 0;
    n.capacity = 0;
    const t = n.tree!;
    const k = t.ids.length;
    const at = (b: Building) => n.at!.get(b.id) ?? 0;
    const zeros = () => new Array<number>(k).fill(0);
    // per conductor: power made, what is served before every tier (line loss and Siphons), each
    // tier's demand, the part of an Overcharge a Jar may pay for (its base draw, §8), the Jars
    const gen = zeros(), first = zeros(), drainAt = zeros(), ocBase = zeros();
    const dem = [0, 1, 2, 3].map(zeros);
    const jarsAt: Building[][] = t.ids.map(() => []);
    const consumers: Building[] = [];
    for (const id of n.members) {
      const b = g.buildings.get(id)!;
      const role = b.def.role;
      const i = at(b);
      const dk = drains.get(b.id);
      if (dk) {
        drainAt[i] += dk;
        n.drain += dk;
      }
      if (role === 'core') {
        b.output = g.hearthOutput();
        n.gen += b.output;
        gen[i] += b.output;
      } else if (role === 'generator') {
        if (b.off) b.output = 0;
        n.gen += b.output;
        gen[i] += b.output;
      } else if (role === 'node') {
        // long lines lose their kW before anyone sees it (§3.2), where the line is
        if (b.offline <= 0) {
          const l = g.spec(b).lineLoss ?? 0;
          n.loss += l;
          first[i] += l;
        }
      } else if (role === 'storage') {
        jarsAt[i].push(b);
        b.flow = 0;
      } else if (isConsumer(b)) {
        b.demand = demandOf(g, b);
        const tt = tierOf(b);
        n.tiers[tt].demand += b.demand;
        n.demand += b.demand;
        dem[tt][i] += b.demand;
        if (b.overcharge > 0) ocBase[i] += b.demand / ocMult(g);
        consumers.push(b);
        if (b.def.role === 'tower' || b.def.role === 'beacon') total.peak += fullDraw(g, b);
      }
    }
    // a Siphon's drink is demand like any other, so Jars give for it, but it is served first
    n.demand += n.drain;
    for (let i = 0; i < k; i++) first[i] += drainAt[i];
    const made = Math.max(0, n.gen - n.loss);
    // live power first, tier by tier: the Works (tier 1) in full, then Overcharges (tier 0: after
    // the Works since the fifth review, so a burst can't starve the factory), then the Wall and the
    // Labs (§2.3, §8), each along links that carry at most their capacity (§3.3)
    const src = gen.slice();
    const flow = zeros();
    const s1 = allocate(t, first, src, flow);
    const sat = dem.map((d) => d.map(() => 0));
    for (const tt of ORDER) sat[tt] = allocate(t, dem[tt], src, flow);
    // then the Jars give for what live power couldn't reach, up to each one's discharge rate
    // (§2.1), in the same order. Never for an Overcharge's extra, here or in anything it starves:
    // with an Overcharge on, each Jar gives at most what it would have given with every Overcharge
    // at its base draw, and that budget goes to the real shortfalls tier by tier (§8, the third
    // review; the fifth review C2: a cap per tier paid the Labs ahead of the wall)
    const avail = jarsAt.map((js) => js.reduce((a, j) => a + (j.off ? 0 : Math.min(g.spec(j).maxDischarge ?? 0, j.charge / DT)), 0));
    let budget = avail;
    if (ocBase.some((x) => x > 0)) {
      const src0 = gen.slice(), flow0 = zeros();
      const base = dem.map((d, tt) => (tt === 0 ? ocBase : d));
      const f0 = allocate(t, first, src0, flow0);
      const sat0 = base.map((d) => d.map(() => 0));
      for (const tt of ORDER) sat0[tt] = allocate(t, base[tt], src0, flow0);
      const j0 = avail.slice();
      allocate(t, first.map((d, i) => d * (1 - f0[i])), j0, flow0);
      for (const tt of ORDER) allocate(t, base[tt].map((d, i) => d * (1 - sat0[tt][i])), j0, flow0);
      budget = avail.map((a, i) => a - j0[i]);
    }
    const jsrc = budget.slice();
    const s1j = allocate(t, first.map((d, i) => d * (1 - s1[i])), jsrc, flow);
    // an Overcharge's base draw only
    const elig = dem.map((d, tt) => d.map((x, i) => (tt === 0 ? Math.max(0, ocBase[i] - x * sat[0][i]) : x * (1 - sat[tt][i]))));
    const satJ = dem.map((d) => d.map(() => 0));
    for (const tt of ORDER) satJ[tt] = allocate(t, elig[tt], jsrc, flow);
    for (let i = 0; i < k; i++) {
      const used = budget[i] - jsrc[i];
      if (used <= 0) continue;
      n.discharge += used;
      for (const j of jarsAt[i]) {
        if (j.off) continue;
        const a = Math.min(g.spec(j).maxDischarge ?? 0, j.charge / DT);
        const share = avail[i] > 0 ? (used * a) / avail[i] : 0;
        if (!dry) j.charge = Math.max(0, j.charge - share * DT);
        j.flow = -share;
      }
    }
    // what is left charges Jars up to their charge rates, as far as the links carry it; the rest
    // is wasted (§2.4)
    const rateOf = (j: Building) => {
      const js = g.spec(j);
      const room = ((js.capacity ?? 0) - j.charge) / DT;
      return j.off ? 0 : Math.max(0, Math.min((js.maxCharge ?? 0) * (g.skills.has('wideMouth') ? SKILL_RULES.wideMouth.v : 1), room));
    };
    const want = jarsAt.map((js) => js.reduce((a, j) => a + rateOf(j), 0));
    const sc = allocate(t, want, src, flow);
    for (let i = 0; i < k; i++) {
      const take = want[i] * sc[i];
      if (take <= 0) continue;
      n.charged += take;
      for (const j of jarsAt[i]) {
        const r = rateOf(j);
        const share = want[i] > 0 ? (take * r) / want[i] : 0;
        if (share <= 0) continue;
        if (!dry) j.charge += share * DT;
        j.flow += share;
      }
    }
    for (let i = 0; i < k; i++) n.wasted += Math.max(0, src[i]);
    const supply = made + n.discharge;
    // what each conductor's tiers got, and what each consumer gets: its conductor's share of its tier
    const got = dem.map((d, tt) => d.map((x, i) => x * sat[tt][i] + elig[tt][i] * satJ[tt][i]));
    for (let tt = 0; tt <= 3; tt++) {
      const ts = n.tiers[tt];
      ts.served = got[tt].reduce((a, b) => a + b, 0);
      ts.sat = ts.demand > 0 ? Math.min(1, ts.served / ts.demand) : 1;
    }
    for (let i = 0; i < k; i++) {
      const un = first[i] * (1 - s1[i]);
      const jarPart = un * s1j[i];
      const share = first[i] > 0 ? (first[i] * s1[i] + jarPart) / first[i] : 1;
      n.stolen += drainAt[i] * share;
    }
    stolen += n.stolen;
    // each Node's load: what its link carried this tick (+ into the branch past it). It is FULL
    // only when that holds the branch back (the fifth review): at its limit inward while something
    // past it still lacks power (a Jar's charging too), or outward while power past it goes to
    // waste that something on this side lacks. A link carrying exactly what its branch asks is not.
    const short = zeros(), spare = zeros();
    for (let i = 0; i < k; i++) {
      for (let tt = 0; tt <= 3; tt++) short[i] += Math.max(0, dem[tt][i] - got[tt][i]);
      short[i] += want[i] * (1 - sc[i]);
      spare[i] = Math.max(0, src[i]);
    }
    for (const i of t.post) {
      const p = t.parent[i];
      if (p >= 0) {
        short[p] += short[i];
        spare[p] += spare[i];
      }
    }
    for (let i = 0; i < k; i++) {
      const c = g.buildings.get(t.ids[i]);
      if (c) {
        c.carry = flow[i];
        const atCap = i > 0 && Math.abs(flow[i]) >= t.cap[i] - 0.5;
        c.full = atCap && (flow[i] > 0 ? short[i] > 0.5 : spare[i] > 0.5 && short[0] - short[i] > 0.5);
      }
    }
    // what full links held back inward: each one's branch shortfall, counted at the first full link
    // on the way out from the root
    for (let i = 1; i < k; i++) {
      const c = g.buildings.get(t.ids[i]);
      if (!c?.full || flow[i] <= 0) continue;
      let up = t.parent[i], outer = false;
      while (up > 0 && !outer) {
        outer = !!g.buildings.get(t.ids[up])?.full;
        up = t.parent[up];
      }
      if (!outer) total.held += short[i];
    }
    n.wall = { demand: 0, served: 0, sat: 1 };
    for (const b of consumers) {
      const i = at(b), tt = tierOf(b);
      const d = dem[tt][i];
      b.sat = b.off || g.tierOff[b.tier] ? 0 : d > 0 ? Math.min(1, got[tt][i] / d) : n.tiers[tt].sat;
      if (b.def.role === 'tower' || b.def.role === 'beacon') {
        // an Overcharged tower is the wall at its base draw: one a full link caps short of its 3×
        // is not starved (the sixth review: BROWNOUT fired with the Wall bar at 100%)
        const base = b.overcharge > 0 ? b.demand / ocMult(g) : b.demand;
        n.wall.demand += base;
        n.wall.served += Math.min(base, b.demand * b.sat);
      }
    }
    n.wall.sat = n.wall.demand > 0 ? n.wall.served / n.wall.demand : 1;
    for (const j of jarsAt.flat()) {
      const spin = g.spec(j).spinDown ?? 0;
      if (spin > 0 && j.charge > 0) {
        // a Flywheel spins down: its friction is power wasted (§3.2)
        const lost = j.charge * spin;
        if (!dry) j.charge = Math.max(0, j.charge - lost * DT);
        n.wasted += lost;
      }
      n.stored += j.charge;
      n.capacity += g.spec(j).capacity ?? 0;
    }
    total.gen += made;
    total.demand += n.demand;
    total.supply += supply;
    total.wasted += n.wasted;
    total.stored += n.stored;
    total.capacity += n.capacity;
    for (let t = 1; t <= 3; t++) {
      total.tiers[t].demand += n.tiers[t].demand;
      total.tiers[t].served += n.tiers[t].served;
    }
    total.wall.demand += n.wall.demand;
    total.wall.served += n.wall.served;
  }
  g.grid = total;
  if (dry) return;
  // what a Veil's sight reads: satisfaction over the last half second, so it doesn't flicker
  const k = Math.min(1, DT / 0.5);
  for (const b of g.buildings.values()) b.satAvg += ((b.net < 0 ? 0 : b.sat) - b.satAvg) * k;
  total.wall.sat = total.wall.demand > 0 ? total.wall.served / total.wall.demand : 1;
  for (let t = 1; t <= 3; t++) {
    const ts = total.tiers[t];
    ts.sat = ts.demand > 0 ? ts.served / ts.demand : 1;
  }
  g.grid = total;
  g.stats.wastedKj += total.wasted * DT;
  g.stats.stolenKj += stolen * DT;
  total.stolen = stolen;

  // brownout: the wall below the starved line; it ends only once the wall is clearly back
  const wall = total.wall;
  const starved = g.brownout ? !(wall.demand <= 0 || wall.sat >= RULES.brownoutEnds.v) : wall.demand > 0 && wall.sat < RULES.starvedBelow.v;
  if (starved !== g.brownout) {
    g.brownoutClock += DT;
    if (g.brownoutClock >= (starved ? 0.25 : 2)) {
      g.brownout = starved;
      g.brownoutClock = 0;
      if (starved) {
        if (g.stats.firstBrownout < 0) g.stats.firstBrownout = g.tick;
        g.emit({ t: 'brownout', sat: wall.sat });
      } else g.emit({ t: 'recovered' });
    }
  } else g.brownoutClock = 0;
  if (g.brownout) g.stats.brownoutSeconds += DT;
}
