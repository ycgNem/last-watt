"""Vane (generator): 32x48, 4 frames (the sails turn), footprint 2x2.

A wind vane seen from the front: four slatted sheet-iron sails on dark spars around a brass
hub, with a small nacelle housing behind it, on a splayed A-frame lattice mast (wide at the
foot, X-braced: not the Beacon's narrow zig-zag rails) bolted to a stone pad. The sails turn
22.5 degrees a frame clockwise, so 4 frames loop seamlessly (4-fold symmetry); each frame is
drawn, not rotated. It is a generator, so the only warm glow is a small lamp in the hub.
Light from the upper left, 1 px #10141f outline. 12 colours.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "1": "#394a50", "2": "#577277", "3": "#819796", "c": "#a8b5b2",   # iron / sheet
    "s": "#4d2b32", "S": "#7a4841",                                   # stone
    "b": "#884b2b", "B": "#be772b", "y": "#de9e41",                   # brass
    "Y": "#e8c170", "W": "#ebede9",                                   # hub lamp
}
HX, HY = 16, 13            # hub centre (the light anchor)
TIP = 12.3                 # sail tip radius
FOOT_Y, TOP_Y = 39, 17     # mast legs: foot level and where they meet the nacelle
LEGS = ((8, 13), (23, 18))  # (x at the foot, x at the top) for the left and right legs


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def put(x, y, ch, empty_only=False):
    if empty_only and s.get(x, y) is not None:
        return
    s.px(x, y, C[ch])


def pad():
    seg(40, 7, "SSSSSSSSSSSSSSSSSs")
    seg(41, 6, "S" * 19 + "s")
    seg(42, 6, "S" * 19 + "s")
    for y in (43, 44, 45):
        seg(y, 6, "s" * 20)
    seg(46, 7, "s" * 18)
    # bolted foot plates under each leg
    seg(38, 6, "3322")
    seg(39, 6, "2211")
    seg(38, 22, "3221")
    seg(39, 22, "2111")


def nacelle():
    # small iron housing behind the hub; its lit top shows between the sails
    seg(9, 13, "333322")
    for y in range(10, 18):
        seg(y, 12, "32222111")
    seg(18, 13, "111111")


def leg_x(i, y):
    xb, xt = LEGS[i]
    return round(xb + (xt - xb) * (FOOT_Y - y) / (FOOT_Y - TOP_Y))


def lattice():
    """Drawn after the outline pass, only on empty pixels, so the braces stay open and stay
    behind the sails."""
    levels = [FOOT_Y - 1, 32, 26, 21]
    for y in range(TOP_Y + 1, FOOT_Y):
        xl, xr = leg_x(0, y), leg_x(1, y)
        put(xl, y, "3", True)
        put(xl + 1, y, "2", True)
        put(xr, y, "1", True)
        for x in (xl - 1, xr + 1):
            put(x, y, "o", True)
    for i, ly in enumerate(levels):
        xl, xr = leg_x(0, ly), leg_x(1, ly)
        for x in range(xl + 2, xr):
            put(x, ly, "1", True)
        if i + 1 < len(levels):
            ny = levels[i + 1]
            nl, nr = leg_x(0, ny), leg_x(1, ny)
            for (x0, y0, x1, y1) in ((xl + 2, ly - 1, nr - 1, ny + 1),
                                     (xr - 1, ly - 1, nl + 2, ny + 1)):
                n = max(abs(x1 - x0), abs(y1 - y0))
                for k in range(n + 1):
                    put(round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), "1", True)


def sails(f):
    for b in range(4):
        a = math.radians(f * 22.5 + b * 90 + 0.0)
        d = (math.cos(a), math.sin(a))
        nn = (-math.sin(a), math.cos(a))            # the leading side (clockwise)
        for y in range(0, 30):
            for x in range(1, 31):
                rx, ry = x - HX, y - HY
                al = rx * d[0] + ry * d[1]
                ac = rx * nn[0] + ry * nn[1]
                if al < 1.5 or al > TIP:
                    continue
                w = 1.7 + 3.0 * (al - 3.5) / (TIP - 3.5)
                if abs(ac) <= 0.55:
                    put(x, y, "1")                    # spar
                elif al >= 3.5 and -w <= ac < -0.55:
                    slat = (al - 3.5) % 2.9 < 0.75
                    edge = ac < -w + 0.9
                    c = "2" if slat else "3"
                    if edge and not slat:
                        c = "2"
                    if al > TIP - 1.2:
                        c = "c" if not edge else "3"  # the tip catches the light
                    put(x, y, c)


def hub():
    for y in range(HY - 3, HY + 4):
        for x in range(HX - 3, HX + 4):
            d = math.hypot(x - HX, y - HY)
            if d < 0.5:
                c = "W"
            elif d < 1.2:
                c = "Y"
            elif d < 1.6:
                c = "y"
            elif d < 2.4:
                c = "B" if (x - HX) + (y - HY) < 0.5 else "b"
            else:
                continue
            put(x, y, c)


s = Sprite(32, 48, palette=PAL)
for f in range(4):
    if f:
        s.add_frame(copy=False)
    pad()
    nacelle()
    sails(f)
    hub()
    s.outline(OUTLINE, where="outside")
    lattice()
s.set_duration(125)
s.frame(1)
export(s, "vane", light=(HX, HY), fps=8)
s.stats()
