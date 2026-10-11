// Transmission with capacity (DESIGN.md §3.3, Milestone 3; the fourth review's C1): a network is a
// tree of conductors grown from its root (the Hearth, or the conductor making the most power),
// every other building draws through one conductor, and each Node carries at most its capacity
// in either direction. Power is shared tier by tier as before (§2.3); inside a tier every
// conductor gets the same share unless a Node on its way is full, and then the branch past that
// Node gets what fits and the rest of the network carries on without it (max-min fair). Pure.

/** a network's tree, fixed until the networks are rebuilt */
export interface FlowTree {
  /** conductor building ids, root first, in breadth-first order */
  ids: number[];
  /** index of each conductor's parent (-1 for the root) */
  parent: number[];
  /** kW the link to the parent carries at most, either way (Infinity for the root) */
  cap: number[];
  /** children of each conductor */
  kids: number[][];
  /** post-order (leaves first) */
  post: number[];
}

const EPS = 1e-9;

/** a tree from an adjacency list (conductor index → neighbour indices), rooted at `root` */
export function buildTree(ids: number[], adj: number[][], root: number, capOf: (i: number) => number): FlowTree {
  const k = ids.length;
  const parent = new Array<number>(k).fill(-2);
  const order: number[] = [root];
  parent[root] = -1;
  for (let h = 0; h < order.length; h++) {
    const v = order[h];
    for (const u of [...adj[v]].sort((a, b) => ids[a] - ids[b])) {
      if (parent[u] !== -2) continue;
      parent[u] = v;
      order.push(u);
    }
  }
  // anything unreached (shouldn't happen inside one network) hangs off the root
  for (let i = 0; i < k; i++)
    if (parent[i] === -2) {
      parent[i] = root;
      order.push(i);
    }
  const remap = new Map(order.map((old, i) => [old, i]));
  const out: FlowTree = { ids: order.map((i) => ids[i]), parent: [], cap: [], kids: order.map(() => []), post: [] };
  order.forEach((old, i) => {
    const p = parent[old];
    out.parent[i] = p < 0 ? -1 : remap.get(p)!;
    out.cap[i] = p < 0 ? Infinity : capOf(old);
    if (p >= 0) out.kids[remap.get(p)!].push(i);
  });
  for (let i = order.length - 1; i >= 0; i--) out.post.push(i);
  return out;
}

/**
 * Share one tier's demand `d` (per conductor) out of the supplies `src` (consumed in place), along
 * links whose current flow is `flow` (+ into the branch, updated in place). Returns each
 * conductor's share 0..1: as even as the supplies allow, lower only where a full link holds a
 * branch back.
 */
export function allocate(t: FlowTree, d: number[], src: number[], flow: number[]): number[] {
  const k = d.length;
  const s = new Array<number>(k).fill(0);
  const frozen = d.map((x) => x <= EPS);
  for (let i = 0; i < k; i++) if (frozen[i]) s[i] = 1;
  const need = new Array<number>(k).fill(0);
  const imp = (i: number) => t.cap[i] - flow[i];
  const exp = (i: number) => t.cap[i] + flow[i];
  // bottom-up: what each branch must take in (+) or can give up (−) at shares `s`; the links that
  // can't carry it, and whether the root comes up short
  const check = (): { root: boolean; links: number[] } => {
    const links: number[] = [];
    for (const i of t.post) {
      let n = d[i] * s[i] - src[i];
      for (const c of t.kids[i]) n += need[c] > 0 ? need[c] : -Math.min(-need[c], Math.max(0, exp(c)));
      need[i] = n;
      if (t.parent[i] >= 0 && n > imp(i) + EPS) links.push(i);
    }
    return { root: need[0] > EPS, links };
  };
  let level = 0;
  for (let guard = 0; guard < k + 2; guard++) {
    const active: number[] = [];
    for (let i = 0; i < k; i++) if (!frozen[i]) active.push(i);
    if (!active.length) break;
    const set = (x: number) => {
      for (const i of active) s[i] = x;
    };
    set(1);
    let r = check();
    if (!r.root && !r.links.length) break;
    let lo = level, hi = 1;
    for (let it = 0; it < 32; it++) {
      const mid = (lo + hi) / 2;
      set(mid);
      const c = check();
      if (c.root || c.links.length) hi = mid;
      else lo = mid;
    }
    set(hi);
    r = check();
    // the bisection's last few bits are noise: a share that small is none
    if (lo < 1e-6) lo = 0;
    set(lo);
    if (r.root || !r.links.length) {
      for (const i of active) frozen[i] = true;
      break;
    }
    // the branches past a full link stop here; the rest keep rising
    const mark = (v: number) => {
      if (!frozen[v]) frozen[v] = true;
      for (const c of t.kids[v]) mark(c);
    };
    for (const v of r.links) mark(v);
    level = lo;
  }
  check();
  // top-down: who sends what where, and whose supply is used
  const settle = (i: number, inflow: number) => {
    let required = d[i] * s[i] + Math.max(0, -inflow);
    const have = src[i] + Math.max(0, inflow);
    const offers: [number, number][] = [];
    for (const c of t.kids[i]) {
      if (need[c] > EPS) required += need[c];
      else {
        const o = Math.min(-need[c], Math.max(0, exp(c)));
        if (o > EPS) offers.push([c, o]);
      }
    }
    const short = required - have;
    const total = offers.reduce((a, [, o]) => a + o, 0);
    const take = Math.max(0, Math.min(short, total));
    const used = Math.max(0, Math.min(src[i], required - Math.max(0, inflow) - take));
    src[i] -= used;
    const sends = new Map(offers);
    for (const c of t.kids[i]) {
      if (need[c] > EPS) {
        flow[c] += need[c];
        settle(c, need[c]);
      } else if (sends.has(c)) {
        const sent = total > 0 ? (take * sends.get(c)!) / total : 0;
        flow[c] -= sent;
        settle(c, -sent);
      } else settle(c, 0); // a branch that covers itself still uses its own supply
    }
  };
  settle(0, 0);
  return s;
}
