// Fuel (§3): Extractors dig emberrock at their satisfaction and hand it to a Burner touching
// them (the slice's stand-in for belts, DECISIONS.md); Burners burn one rock per 10 s while lit.
import { DT, type Game } from '../Game';
import { touches } from '../geom';
import type { Building } from '../types';

export function economySystem(g: Game) {
  const burners: Building[] = [];
  for (const b of g.buildings.values()) if (b.def.role === 'generator') burners.push(b);
  for (const b of g.buildings.values()) {
    if (b.def.role !== 'extractor') continue;
    const d = b.def;
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
        if (u.fuel >= (u.def.fuelCap ?? 0) || !touches(g.rect(b), g.rect(u))) continue;
        if (!best || u.fuel < best.fuel) best = u;
      }
      if (best) {
        best.fuel++;
        b.stock--;
      }
    }
  }
  for (const u of burners) {
    const d = u.def;
    const was = u.output > 0;
    if (u.off || u.net < 0) {
      u.output = 0;
      continue;
    }
    if (u.burnLeft <= 0 && u.fuel > 0) {
      u.fuel--;
      // one rock: 400 kJ of heat × 0.5 efficiency at 20 kW = 10 s (§3)
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
}
