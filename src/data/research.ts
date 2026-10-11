// Research projects (DESIGN.md §7): priced in kJ, paid by Labs drawing power at 1:1.

export interface ResearchDef {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  why: Record<string, string>;
}

export const RESEARCH: Record<string, ResearchDef> = {
  lamp2: {
    id: 'lamp2', name: 'Lamp tier 2', blurb: 'Lamps can be upgraded: 18 kW firing at 0.6 = 10.8 kJ/s.', cost: 900,
    why: { cost: '§7 Lamp tier 2: 900 kJ' },
  },
};

export const RESEARCH_ORDER = ['lamp2'];
