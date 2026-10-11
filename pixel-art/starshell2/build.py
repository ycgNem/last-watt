"""Starshell (tier 2): 32x48, 2 frames (shell and charge coils pulse), footprint 2x2.

Same family as the tier-1 Starshell (brass mortar cocked up in an iron cradle on a riveted
turntable, a white-hot shell in the muzzle) but the barrel is longer and fatter and wound
with three glowing charge coils, the turntable is wider with a brass band, and a rack of two
spare shells stands on its right. Tier 1 is a stub; tier 2 is a loaded gun with ammunition
beside it, so the silhouette gains height and a second mass. Light from the upper left,
1 px #10141f outline. 12 colours (as tier 1).
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "1": "#394a50", "2": "#577277", "3": "#819796",                   # iron
    "s": "#4d2b32", "S": "#7a4841",                                   # stone
    "n": "#602c2c", "b": "#884b2b", "B": "#be772b", "y": "#de9e41",   # brass
    "Y": "#e8c170", "W": "#ebede9",                                   # shell glow
}

A = (12.0, 31.0)          # breech centre
M = (19.0, 12.0)          # muzzle centre (the light anchor)
R = 5.0                   # tube radius
L = math.hypot(M[0] - A[0], M[1] - A[1])
U = ((M[0] - A[0]) / L, (M[1] - A[1]) / L)       # along the tube
N = (-U[1], U[0])                                 # across it; negative = the lit (left) side
if N[0] < 0:
    N = (-N[0], -N[1])
TT = (16.0, 35.0, 12.5, 3.5, 4)                   # turntable: centre, rx, ry, side height


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def put(x, y, ch):
    s.px(x, y, C[ch])


def q(cx, cy, rx, ry, x, y):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def slab():
    seg(40, 3, "S" * 25 + "s")
    seg(41, 2, "S" * 27 + "s")
    seg(42, 2, "S" * 27 + "s")
    for y in (43, 44, 45):
        seg(y, 2, "s" * 28)
    seg(46, 3, "s" * 26)


def turntable():
    cx, cy, rx, ry, hgt = TT
    for y in range(26, 47):
        for x in range(2, 30):
            if q(cx, cy, rx, ry, x, y) <= 1:
                d = q(cx, cy, rx, ry, x, y)
                k = (x - cx) / rx + (y - cy) / ry
                put(x, y, ("y" if k < -0.2 else "B") if d > 0.55 and y > cy - 1
                    else "3" if k < -0.4 else "2")        # brass rim on the front arc
            elif any(q(cx, cy + h, rx, ry, x, y) <= 1 for h in range(1, hgt + 1)):
                u = (x - cx) / rx
                put(x, y, "2" if u < -0.55 else "1")
    for x in range(int(cx - rx) + 1, int(cx + rx) + 1):   # brass band round the drum
        y = round(cy + ry * (1 - ((x - cx) / rx) ** 2) ** 0.5) + 2
        put(x, y, "y" if x < cx - 4 else "B" if x < cx + 5 else "b")


def cradle():
    # an iron wedge under the breech, its sloped top following the tube
    for y in range(24, 35):
        for x in range(7, 25):
            p = (x - A[0]) * N[0] + (y - A[1]) * N[1]
            t = (x - A[0]) * U[0] + (y - A[1]) * U[1]
            if -6.5 <= p <= 6.5 and t <= 5.5 and y <= 33:
                put(x, y, "3" if p < -5.5 or t > 4.6 else "2" if p < -3.5 else "1")
    seg(33, 7, "1" * 18)


def tube(f):
    for y in range(4, 36):
        for x in range(3, 30):
            px, py = x - A[0], y - A[1]
            t = px * U[0] + py * U[1]
            p = px * N[0] + py * N[1]
            coil = any(c0 <= t <= c0 + 1.3 for c0 in (6.0, 9.2, 12.4))
            ring = L - 3.6 <= t <= L - 1.8
            r = R + (0.7 if ring or coil else 0)
            if -1.5 <= t <= L and abs(p) <= r:
                v = p / r
                if coil:                                      # glowing charge coils
                    c = ("W" if v < -0.5 else "Y" if v < 0.3 else "y") if f == 0 else                         ("Y" if v < -0.5 else "y" if v < 0.3 else "B")
                elif ring:
                    c = "3" if v < -0.45 else "2" if v < 0.4 else "1"
                else:
                    c = "y" if v < -0.5 else "B" if v < 0.15 else "b" if v < 0.65 else "n"
                put(x, y, c)
    # trunnion boss on the lit side, where the tube pivots in the cradle
    cx = A[0] + U[0] * 3 - N[0] * 4.0
    cy = A[1] + U[1] * 3 - N[1] * 4.0
    for y in range(int(cy) - 2, int(cy) + 3):
        for x in range(int(cx) - 2, int(cx) + 3):
            d = math.hypot(x - cx, y - cy)
            if d <= 1.9:
                put(x, y, "o" if d < 0.6 else "3" if (x - cx) + (y - cy) < -0.5 else "1")


def rack():
    """Two spare shells standing in an iron rack on the turntable's right (shadow) side."""
    for x0 in (22, 25):
        seg(26, x0 + 1, "y")
        seg(27, x0, "yBb")
        for y in range(28, 34):
            seg(y, x0, "Bbn")
        seg(30, x0, "321")                        # driving band
    seg(31, 21, "22221111")                        # rack bar in front of them
    seg(32, 21, "1111ooo")


def muzzle(f):
    ra, rb = R + 0.7, 2.7                    # across / along the tube (seen from above)
    glow = 0.30 if f == 0 else 0.18
    for y in range(4, 24):
        for x in range(10, 28):
            px, py = x - M[0], y - M[1]
            a = (px * N[0] + py * N[1]) / ra
            b = (px * U[0] + py * U[1]) / rb
            d = a * a + b * b
            if d > 1:
                continue
            if d > 0.62:
                c = "Y" if a - b < -0.5 else "y" if a - b < 0.6 else "B"   # brass lip
            elif d > 0.45:
                c = "o"                                                    # the bore
            elif d < glow:
                c = "W"
            else:
                c = "Y"
            put(x, y, c)
    if f == 1:                                   # heat rising off the shell
        put(int(M[0]) - 1, int(M[1]) - 5, "Y")
        put(int(M[0]) + 1, int(M[1]) - 7, "y")


s = Sprite(32, 48, palette=PAL)
for f in (0, 1):
    if f:
        s.add_frame(copy=False)
    slab()
    turntable()
    cradle()
    tube(f)
    rack()
    muzzle(f)
    s.outline(OUTLINE, where="outside")
s.set_duration(330)
s.frame(1)
export(s, "starshell2", light=(int(M[0]), int(M[1])), fps=3)
s.stats()
