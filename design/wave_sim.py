"""Rough wave check behind DESIGN.md §6 (waves 1 and 2). Not game code: a quick model of the slice
rules so a derivation can be re-run when a number changes. `python3 design/wave_sim.py`

Model: a 36-tile reference path (east 12 / south 12 / east 12 to the Hearth); Moths walk it at a
fixed speed; Lamps (2x2, centre 1.5 tiles off the path) each hit the Moth in range that is
nearest to the station; tier-1 satisfaction = min(1, supply / tower demand), with idle draw for
a Lamp that has no target. No Shades, no Floodlight, no hand-fed fuel: the Burner is assumed fed.
The real pace tests run the real sim on the real map in Milestone 1."""
import math

DT = 1 / 60
PATH = [(0, 0), (12, 0), (12, 12), (24, 12)]
SEGS, _acc = [], 0.0
for _a, _b in zip(PATH, PATH[1:]):
    SEGS.append((_a, _b, _acc, math.dist(_a, _b)))
    _acc += math.dist(_a, _b)
PATH_LEN = _acc


def pos(d):
    for a, b, s0, length in SEGS:
        if d <= s0 + length:
            t = (d - s0) / length
            return a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
    return PATH[-1]


def leaks(lamps, count, spacing, hp=30.0, speed=1.5, supply=28.0,
          idle=1.0, fire=12.0, eff=0.5, rng=3.5):
    """Moths that reach the Hearth alive. lamps: list of (x, y) centres."""
    moths, t, spawned, leaked = [], 0.0, 0, 0
    while True:
        if spawned < count and t >= spawned * spacing - 1e-9:
            moths.append([0.0, hp])
            spawned += 1
        targets = []
        for lx, ly in lamps:
            in_range = [m for m in moths if math.dist(pos(m[0]), (lx, ly)) <= rng]
            targets.append(max(in_range, key=lambda m: m[0]) if in_range else None)
        demand = sum(fire if tg else idle for tg in targets)
        sat = min(1.0, supply / demand) if demand else 1.0
        for tg in targets:
            if tg:
                tg[1] -= fire * eff * sat * DT
        for m in moths:
            m[0] += speed * DT
        leaked += sum(1 for m in moths if m[0] >= PATH_LEN and m[1] > 0)
        moths = [m for m in moths if m[1] > 0 and m[0] < PATH_LEN]
        t += DT
        if spawned == count and not moths:
            return leaked


BEND1, BEND2 = (10.5, 1.5), (13.5, 10.5)        # inside corners of the two bends
BEND1_B, BEND2_B = (10.5, 3.5), (15.5, 10.5)    # a second Lamp beside each
STRAIGHTS = [(6, 1.5), (18, 10.5)]              # middles of the first and last legs

if __name__ == "__main__":
    print("Wave 1: 8 Moths. Leaks by spacing.")
    rows = {
        "A  2 Lamps at the bends, Burner (28 kW)": dict(lamps=[BEND1, BEND2]),
        "S  2 Lamps on straights, Burner (28 kW)": dict(lamps=STRAIGHTS),
        "B  4 Lamps, no Burner (8 kW)": dict(lamps=[BEND1, BEND1_B, BEND2, BEND2_B], supply=8),
        "   2 Lamps at the bends, no fuel (8 kW)": dict(lamps=[BEND1, BEND2], supply=8),
    }
    spacings = (2.0, 2.25, 2.5)
    print(f"{'':42}" + "".join(f"{s:>7}" for s in spacings))
    for name, kw in rows.items():
        print(f"{name:42}" + "".join(f"{leaks(count=8, spacing=s, **kw):>7}" for s in spacings))
    print("\nWave 2: 12 Moths at 1.75 s.")
    print("  2 Lamps at the bends, 28 kW:       ", leaks([BEND1, BEND2], 12, 1.75))
    print("  3 Lamps, same 28 kW (sat 0.74):    ", leaks([BEND1, BEND2, BEND1_B], 12, 1.75))
    print("  3 Lamps + a second Burner (48 kW): ", leaks([BEND1, BEND2, BEND1_B], 12, 1.75, supply=48))
