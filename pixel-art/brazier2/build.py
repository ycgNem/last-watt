"""Brazier (tier 2): 32x48, 4 frames (the fire licks and sways), footprint 2x2.

Same family as the tier-1 Brazier (round iron grate bowl, fire showing through the gaps and
licking outward on all sides) but lifted onto a stone column with a capital and a round foot,
the bowl bigger and deeper with a brass belly band and a brass rim, and iron prongs rising
round the rim. Tier 1 is a low fire on the ground; tier 2 is a fire held up at chest height,
so the silhouette gains height and the flame stands higher. Light from the upper left,
1 px #10141f outline. 12 colours.
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
    "B": "#be772b",                                                   # brass (with A, Y)
    "R": "#cf573c", "a": "#da863e", "A": "#de9e41",                   # fire
    "Y": "#e8c170", "W": "#ebede9",
}
CX = 15.5
RIM_Y, RIM_RX, RIM_RY = 22, 12.0, 3.2
BOWL_H = 7
PL_Y, PL_RX, PL_RY, PL_H = 42, 9.5, 2.4, 2       # round foot
COL_RX, COL_TOP = 4.0, 32                        # column
CAP_Y, CAP_RX, CAP_RY = 31, 6.5, 1.8             # capital under the bowl
FIRE_Y = 21


def put(x, y, ch):
    s.px(x, y, C[ch])


def q(cx, cy, rx, ry, x, y):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def disc(cy, rx, ry, hgt, top, side):
    for y in range(0, 48):
        for x in range(1, 31):
            if q(CX, cy, rx, ry, x, y) <= 1:
                k = (x - CX) / rx + 0.6 * (y - cy) / ry
                put(x, y, top if k < 0.7 else side)
            elif any(q(CX, cy + h, rx, ry, x, y) <= 1 for h in range(1, hgt + 1)):
                put(x, y, side)


def pedestal():
    disc(PL_Y, PL_RX, PL_RY, PL_H, "S", "s")
    for y in range(COL_TOP, PL_Y + 1):               # the column, lit on the left
        for x in range(1, 31):
            u = (x - CX) / COL_RX
            if abs(u) <= 1:
                put(x, y, "S" if u < -0.1 else "s")
    for y in (36, 40):                               # block courses
        for x in range(int(CX - COL_RX) + 1, int(CX + COL_RX) + 1):
            put(x, y, "s" if x < CX else "o")
    disc(CAP_Y, CAP_RX, CAP_RY, 2, "S", "s")


def bowl_rx(h):
    return RIM_RX - 5.2 * (h / BOWL_H) ** 1.6


def bowl():
    bars = [math.sin(math.radians(a)) for a in (-72, -44, -15, 15, 44, 72)]
    for y in range(RIM_Y, RIM_Y + BOWL_H + 4):
        for x in range(1, 31):
            hit = None
            for k in range(0, BOWL_H * 4 + 1):
                h = k / 4
                rx = bowl_rx(h)
                u = (x - CX) / rx
                if abs(u) > 1:
                    continue
                if RIM_Y + h + RIM_RY * rx / RIM_RX * math.sqrt(1 - u * u) >= y - 0.5:
                    hit = h
                    break
            if hit is None:
                continue
            u = (x - CX) / bowl_rx(hit)
            bar = min(abs(u - b) for b in bars) < 0.12
            if abs(hit - 3.5) < 0.6:                       # brass belly band
                c = "A" if u < -0.5 else "B" if u < 0.5 else "1"
            elif bar or hit > BOWL_H - 1.2:
                c = "2" if u < -0.5 else "1" if u < 0.4 else "o"
            else:
                c = "a" if hit < 2 else "R" if hit < 4.5 else "s"
                if u > 0.55:
                    c = {"a": "R", "R": "s", "s": "s"}[c]
            put(x, y, c)


def coals():
    for y in range(RIM_Y - 4, RIM_Y + 1):
        for x in range(3, 29):
            d = q(CX, RIM_Y, RIM_RX - 1.2, RIM_RY - 0.9, x, y)
            if d <= 1:
                put(x, y, "W" if d < 0.25 else "Y" if d < 0.55 else "A" if d < 0.85 else "a")


def back_rim():
    for y in range(RIM_Y - 4, RIM_Y + 1):
        for x in range(2, 30):
            d = q(CX, RIM_Y, RIM_RX, RIM_RY, x, y)
            if 0.62 < d <= 1.0 and y < RIM_Y:
                put(x, y, "1")


def front_rim():
    for y in range(RIM_Y - 1, RIM_Y + 5):
        for x in range(2, 30):
            d = q(CX, RIM_Y, RIM_RX, RIM_RY, x, y)
            d2 = q(CX, RIM_Y + 1, RIM_RX, RIM_RY, x, y)
            if y >= RIM_Y and (0.62 < d <= 1.0 or (d > 1.0 and d2 <= 1.0)):
                u = (x - CX) / RIM_RX
                put(x, y, "A" if u < -0.4 else "B" if u < 0.2 else "1")    # brass rim


def prongs():
    for u in (-0.92, -0.5, 0.0, 0.5, 0.92):
        x0 = round(CX + RIM_RX * u)
        y0 = round(RIM_Y + RIM_RY * math.sqrt(1 - u * u)) - 1
        lean = -1 if u < -0.7 else 1 if u > 0.7 else 0
        for i in range(5):
            x = x0 + (lean if i >= 3 else 0)
            put(x, y0 - i, "2" if u < 0.3 else "1")
        put(x0 + lean, y0 - 5, "3")                       # lit tip


TONGUES = [
    (15.5, 16.5, 4.8, 0.0, 0.0),
    (10.5, 12.5, 3.6, -4.0, 1.7),
    (20.5, 13.5, 3.6, 4.0, 3.4),
    (6.0, 8.0, 2.6, -5.5, 0.9),
    (25.0, 8.5, 2.6, 5.5, 2.6),
]


def fire(f):
    field = {}
    for bx, h, w, lean, ph in TONGUES:
        a = 2 * math.pi * f / 4 + ph
        hh = h * (1 + 0.15 * math.sin(a))
        ll = lean + 1.2 * math.sin(a + 1.1)
        for y in range(0, FIRE_Y + 1):
            t = (FIRE_Y - y) / hh
            if t < 0 or t > 1:
                continue
            xc = bx + ll * t ** 1.5 + 0.8 * math.sin(a + t * 4)
            hw = w * (1 - t) ** 0.85 + 0.35
            for x in range(1, 31):
                dx = abs(x - xc) / hw
                if dx <= 1:
                    v = (1 - dx) * (1 - t) ** 0.55
                    field[(x, y)] = max(field.get((x, y), 0), v)
    for (x, y), v in field.items():
        if y < 1:
            continue
        c = "W" if v > 0.78 else "Y" if v > 0.55 else "A" if v > 0.36 else "a" if v > 0.16 \
            else "R"
        put(x, y, c)
    for (x, y) in [((8, 5), (23, 3)), ((12, 2), (26, 8)), ((5, 9), (20, 1)),
                   ((10, 3), (24, 5))][f]:
        put(x, y, "A")


s = Sprite(32, 48, palette=PAL)
for f in range(4):
    if f:
        s.add_frame(copy=False)
    pedestal()
    bowl()
    back_rim()
    coals()
    fire(f)
    front_rim()
    prongs()
    s.outline(OUTLINE, where="outside")
s.set_duration(125)
s.frame(1)
export(s, "brazier2", light=(16, 14), fps=8)
s.stats()
