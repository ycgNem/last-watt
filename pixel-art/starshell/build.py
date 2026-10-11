"""Starshell: 32x48, 2 frames (the shell in the muzzle pulses), footprint 2x2.

A stubby brass mortar: a short, fat tube reinforced with iron rings, cocked up at about 67
degrees in an iron cradle with a brass trunnion boss, on a riveted iron turntable drum with
a brass rim, on a stone slab. The muzzle is seen from above as an oval: a brass lip, a dark
bore and a white-hot shell sitting in it. Squat and chunky; the only diagonal in the tower
set. Light from the upper left, 1 px #10141f outline. 12 colours.
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

A = (12.5, 30.0)          # breech centre
M = (19.0, 15.0)          # muzzle centre (the light anchor)
R = 4.6                   # tube radius
L = math.hypot(M[0] - A[0], M[1] - A[1])
U = ((M[0] - A[0]) / L, (M[1] - A[1]) / L)       # along the tube
N = (-U[1], U[0])                                 # across it; negative = the lit (left) side
if N[0] < 0:
    N = (-N[0], -N[1])
TT = (16.0, 34.0, 11.0, 3.2, 4)                   # turntable: centre, rx, ry, side height


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def put(x, y, ch):
    s.px(x, y, C[ch])


def q(cx, cy, rx, ry, x, y):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def slab():
    seg(40, 5, "SSSSSSSSSSSSSSSSSSSSSs")
    seg(41, 4, "S" * 23 + "s")
    seg(42, 4, "S" * 23 + "s")
    for y in (43, 44, 45):
        seg(y, 4, "s" * 24)
    seg(46, 5, "s" * 22)


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
    for x in (7, 11, 15, 19, 23):                         # rivets on the drum's side
        put(x, 38 if abs(x - 16) < 6 else 37, "3" if x < 16 else "2")


def cradle():
    # an iron wedge under the breech, its sloped top following the tube
    for y in range(24, 35):
        for x in range(7, 25):
            p = (x - A[0]) * N[0] + (y - A[1]) * N[1]
            t = (x - A[0]) * U[0] + (y - A[1]) * U[1]
            if -6.5 <= p <= 6.5 and t <= 5.5 and y <= 33:
                put(x, y, "3" if p < -5.5 or t > 4.6 else "2" if p < -3.5 else "1")
    seg(33, 7, "1" * 18)


def tube():
    for y in range(4, 36):
        for x in range(3, 30):
            px, py = x - A[0], y - A[1]
            t = px * U[0] + py * U[1]
            p = px * N[0] + py * N[1]
            ring = (5.5 <= t <= 7.5) or (L - 3.6 <= t <= L - 1.8)
            r = R + (0.7 if ring else 0)
            if -1.5 <= t <= L and abs(p) <= r:
                v = p / r
                if ring:
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
    tube()
    muzzle(f)
    s.outline(OUTLINE, where="outside")
s.set_duration(330)
s.frame(1)
export(s, "starshell", light=(int(M[0]), int(M[1])), fps=3)
s.stats()
