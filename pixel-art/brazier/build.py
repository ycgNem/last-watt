"""Brazier: 32x48, 4 frames (the fire licks and sways), footprint 2x2.

A squat round fire-basket: an iron grate bowl (curved bars, a riveted band, a heavy lit rim)
on three short splayed legs, standing on a low round stone plinth. The fire shows through
every gap in the grate and climbs out of the bowl in tongues that lean outward on all sides:
radial heat, not a beam. Low and wide; the flame is the silhouette's crown. Light from the
upper left, 1 px #10141f outline. 12 colours.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "0": OUTLINE, "1": "#394a50", "2": "#577277", "3": "#819796",     # iron (0 = soot dark)
    "s": "#4d2b32", "S": "#7a4841",                                   # stone
    "r": "#a53030", "R": "#cf573c", "a": "#da863e", "A": "#de9e41",   # fire
    "Y": "#e8c170", "W": "#ebede9",
}
CX = 15.5
RIM_Y, RIM_RX, RIM_RY = 27, 11.0, 3.0     # bowl rim ellipse
BOWL_H = 7                                  # rim to bottom
PL_Y, PL_RX, PL_RY, PL_H = 40, 12.5, 2.8, 3     # plinth top ellipse and side height
FIRE_Y = 26                                 # flame bases sit on the coal bed


def put(x, y, ch):
    s.px(x, y, C[ch])


def q(cx, cy, rx, ry, x, y):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def plinth():
    for y in range(30, 48):
        for x in range(1, 31):
            if q(CX, PL_Y, PL_RX, PL_RY, x, y) <= 1:
                k = (x - CX) / PL_RX + 0.6 * (y - PL_Y) / PL_RY
                put(x, y, "S" if k < 0.7 else "s")         # top face, shadowed far right
            elif any(q(CX, PL_Y + h, PL_RX, PL_RY, x, y) <= 1 for h in range(1, PL_H + 1)):
                put(x, y, "s")                             # side
    for x in range(int(CX + 1), int(CX + 9)):             # bowl shadow on the plinth top
        for y in (38, 39):
            if q(CX, PL_Y, PL_RX, PL_RY, x, y) <= 1:
                put(x, y, "s")


def legs():
    for (x0, x1) in ((10, 7), (16, 16), (21, 24)):
        for i, y in enumerate(range(33, 40)):
            x = round(x0 + (x1 - x0) * i / 6)
            put(x, y, "2" if x1 <= x0 else "1")
            put(x + 1, y, "1" if x1 <= x0 else "0")


def bowl_rx(h):
    return RIM_RX - 4.6 * (h / BOWL_H) ** 1.6


def bowl():
    """Outer surface: the rim ellipse swept down while it narrows. Bars follow longitudes;
    between them the fire glows through, hottest near the top."""
    bars = [math.sin(math.radians(a)) for a in (-72, -44, -15, 15, 44, 72)]
    for y in range(RIM_Y, RIM_Y + BOWL_H + 4):
        for x in range(2, 30):
            hit = None
            for k in range(0, BOWL_H * 4 + 1):              # the cross-section whose front
                h = k / 4                                   # arc passes through this pixel
                rx = bowl_rx(h)
                u = (x - CX) / rx
                if abs(u) > 1:
                    continue
                if RIM_Y + h + RIM_RY * rx / RIM_RX * math.sqrt(1 - u * u) >= y - 0.5:
                    hit = h
                    break
            if hit is None:
                continue
            rx = bowl_rx(hit)
            u = (x - CX) / rx                               # -1..1 across the bowl
            bar = min(abs(u - b) for b in bars) < 0.13
            if abs(hit - 3.5) < 0.6:                        # riveted band round the belly
                c = "3" if u < -0.3 else "2" if u < 0.4 else "1"
                if bar:
                    c = "3" if u < 0.2 else "2"
            elif bar or hit > BOWL_H - 1.2:
                c = "2" if u < -0.5 else "1" if u < 0.4 else "0"
            else:
                c = "a" if hit < 2 else "R" if hit < 4.5 else "r"
                if u > 0.55:
                    c = {"a": "R", "R": "r", "r": "r"}[c]
            put(x, y, c)


def coals():
    for y in range(RIM_Y - 3, RIM_Y + 1):
        for x in range(4, 28):
            d = q(CX, RIM_Y, RIM_RX - 1.2, RIM_RY - 0.9, x, y)
            if d <= 1:
                put(x, y, "W" if d < 0.25 else "Y" if d < 0.55 else "A" if d < 0.85 else "a")


def back_rim():
    for y in range(RIM_Y - 4, RIM_Y + 1):
        for x in range(3, 29):
            d = q(CX, RIM_Y, RIM_RX, RIM_RY, x, y)
            if 0.62 < d <= 1.0 and y < RIM_Y:
                put(x, y, "1")


def front_rim():
    for y in range(RIM_Y - 1, RIM_Y + 4):
        for x in range(3, 29):
            d = q(CX, RIM_Y, RIM_RX, RIM_RY, x, y)
            d2 = q(CX, RIM_Y + 1, RIM_RX, RIM_RY, x, y)
            if y >= RIM_Y and (0.62 < d <= 1.0 or (d > 1.0 and d2 <= 1.0)):
                u = (x - CX) / RIM_RX
                put(x, y, "3" if u < -0.2 else "2" if u < 0.55 else "1")


# tongues: base x, height, half-width at the base, lean (px at the tip), phase
TONGUES = [
    (15.5, 17.0, 4.2, 0.0, 0.0),
    (11.0, 12.0, 3.2, -3.5, 1.7),
    (20.0, 13.0, 3.2, 3.5, 3.4),
    (7.0, 7.0, 2.4, -5.0, 0.9),
    (24.0, 7.5, 2.4, 5.0, 2.6),
]


def fire(f):
    field = {}
    for bx, h, w, lean, ph in TONGUES:
        a = 2 * math.pi * f / 4 + ph
        hh = h * (1 + 0.16 * math.sin(a))
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
        c = "W" if v > 0.78 else "Y" if v > 0.55 else "A" if v > 0.36 else "a" if v > 0.2 \
            else "R" if v > 0.08 else "r"
        put(x, y, c)
    # loose sparks above the tips, a different pair each frame
    for (x, y) in [((9, 9), (22, 7)), ((13, 4), (25, 12)), ((7, 12), (19, 3)),
                   ((11, 6), (23, 9))][f]:
        put(x, y, "A")


s = Sprite(32, 48, palette=PAL)
for f in range(4):
    if f:
        s.add_frame(copy=False)
    plinth()
    legs()
    bowl()
    back_rim()
    coals()
    fire(f)
    front_rim()
    s.outline(OUTLINE, where="outside")
s.set_duration(125)
s.frame(1)
export(s, "brazier", light=(16, 20), fps=8)
s.stats()
