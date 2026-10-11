// Fuel (§3): Extractors dig emberrock at their satisfaction and hand it to a Burner touching
// them (the stand-in for belts, DECISIONS.md); Burners burn one rock at a time while lit, unless a
// Snuffer has put them out. Vanes turn the wind into power (§3.2).
import { RULES } from '../../data/rules';
import { DT, type Game } from '../Game';
import { touches } from '../geom';
import type { Building } from '../types';

export function economySystem(g: Game) {
  const burners: Building[] = [];
  for (const b of g.buildings.values()) if (b.def.role === 'generator' && b.def.fuel === 'rock') burners.push(b);
  for (const b of g.buildings.values()) {
    if (b.def.role !== 'extractor') continue;
    const d = g.spec(b);
    if (b.net >= 0 && !b.off && b.stock < (d.stockCap ?? 1)) {
      b.progress += (b.sat * DT) / (d.rockInterval ?? 1);
      if (b.progress >= 1) {
        b.progress -= 1;
        b.stock++;
      }
    }
    if (b.stock > 0) {
      let best: Building | null = null;
      for (const u of burners) {
        if (u.fuel >= (g.spec(u).fuelCap ?? 0) || !touches(g.rect(b), g.rect(u))) continue;
        if (!best || u.fuel < best.fuel) best = u;
      }
      if (best) {
        best.fuel++;
        b.stock--;
      }
    }
  }
  for (const u of burners) {
    const d = g.spec(u);
    const was = u.output > 0;
    if (u.snuffed > 0) u.snuffed = Math.max(0, u.snuffed - DT);
    if (u.off || u.net < 0 || u.snuffed > 0) {
      u.output = 0;
      continue;
    }
    if (u.burnLeft <= 0 && u.fuel > 0) {
      u.fuel--;
      // one rock: 400 kJ of heat × efficiency at the output = 10 s at tier 1, 8 s with bellows (§3)
      u.burnLeft += ((d.rockHeat ?? 0) * (d.efficiency ?? 0)) / (d.output ?? 1);
    }
    if (u.burnLeft > 0) {
      u.burnLeft -= DT;
      u.output = d.output ?? 0;
    } else {
      u.burnLeft = 0;
      u.output = 0;
      if (was) g.emit({ t: 'dry', id: u.id });
    }
  }
  const wind = g.wind();
  for (const b of g.buildings.values()) {
    if (b.def.role !== 'generator' || b.def.fuel !== 'wind') continue;
    b.output = b.off || b.net < 0 ? 0 : (g.spec(b).output ?? 0) * wind * windShade(g, b);
  }
}

/** a Vane's share of the wind after the wakes of the other Vanes near it (§3.2): × 0.7 for each
 *  one within 7 tiles, centre to centre (RULES.windShadow, windShadowRadius) */
export function windShade(g: Game, b: { x: number; y: number; id?: number; def: { size: number } }): number {
  let k = 1;
  const cx = b.x + b.def.size / 2, cy = b.y + b.def.size / 2;
  for (const o of g.buildings.values()) {
    if (o === b || o.def.role !== 'generator' || o.def.fuel !== 'wind') continue;
    if (Math.hypot(o.x + o.def.size / 2 - cx, o.y + o.def.size / 2 - cy) <= RULES.windShadowRadius.v) k *= 1 - RULES.windShadow.v;
  }
  return k;
}
