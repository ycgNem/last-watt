"""Beacon: 32x48, 2 frames (the light pulses and its cage turns), footprint 2x2.

A tall thin lattice mast (two tapering rails, zig-zag braces) on a bolted foot and stone pad,
carrying a caged red-amber warning dome under a brass cap. Frame 1: pulse up, cage bars at
+-45 degrees. Frame 2: pulse down (deep red), bars at 0/+-90 degrees, so the cage visibly turns.
Red identity, not the Lamp's amber. 1 px #10141f outline. 12 colours.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "0": "#202e37", "1": "#394a50", "2": "#577277",                    # iron
    "s": "#4d2b32", "S": "#7a4841",                                    # stone
    "m": "#752438", "r": "#a53030", "R": "#cf573c", "a": "#da863e", "Y": "#e8c170",  # red glass
    "B": "#be772b",                                                    # brass cap
}


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def rail_x(y, x_bot, x_top, y_bot=38, y_top=12):
    return round(x_bot + (x_top - x_bot) * (y_bot - y) / (y_bot - y_top))


def body():
    # stone pad
    seg(41, 9, "SSSSSSSSSSSSSs")
    seg(42, 8, "S" * 15 + "s")
    seg(43, 8, "S" * 15 + "s")
    for y in (44, 45):
        seg(y, 8, "s" * 16)
    seg(46, 9, "s" * 14)
    # bolted iron foot
    seg(38, 10, "222222222221")
    seg(39, 10, "211111111110")
    seg(40, 10, "111111111100")
    seg(39, 11, "2")
    seg(39, 20, "1")
    # collar under the lamp
    seg(11, 11, "2222221111")
    seg(12, 12, "11111100")


XB_L, XB_R, XT_L, XT_R = 11, 20, 13, 18   # rail x at the foot and under the collar


def lattice():
    """Drawn after the outline pass so the gaps stay open: only the rails' outer edges get
    the outline; the braces read as thin iron against whatever ground is behind."""
    levels = [37, 31, 25, 19, 13]
    for i, ly in enumerate(levels):
        xl, xr = rail_x(ly, XB_L, XT_L), rail_x(ly, XB_R, XT_R)
        s.line(xl, ly, xr, ly, C["1"])
        if i + 1 < len(levels):
            ny = levels[i + 1]
            if i % 2 == 0:
                s.line(xl + 1, ly - 1, rail_x(ny, XB_R, XT_R) - 1, ny + 1, C["1"])
            else:
                s.line(xr - 1, ly - 1, rail_x(ny, XB_L, XT_L) + 1, ny + 1, C["1"])
    for y in range(13, 38):
        xl, xr = rail_x(y, XB_L, XT_L), rail_x(y, XB_R, XT_R)
        s.px(xl, y, C["2"])
        s.px(xr, y, C["1"])
        for x in (xl - 1, xr + 1):
            if s.get(x, y) is None:
                s.px(x, y, OUTLINE)


GLASS = {
    0: {"ramp": ["Y", "a", "R", "r"], "bars": (12, 19)},
    1: {"ramp": ["R", "r", "r", "m"], "bars": (11, 15, 16, 20)},
}
DOME = {3: (13, 18), 4: (12, 19), 5: (11, 20), 6: (11, 20), 7: (11, 20), 8: (11, 20),
        9: (11, 20), 10: (12, 19)}


def lamp(f):
    g = GLASS[f]
    for y, (x0, x1) in DOME.items():
        for x in range(x0, x1 + 1):
            d = math.hypot((x - 15.5) / 4.6, (y - 6.8) / 3.9)
            k = 0 if d < 0.38 else 1 if d < 0.66 else 2 if d < 0.92 else 3
            s.px(x, y, C[g["ramp"][k]])
    for x in g["bars"]:
        for y, (x0, x1) in DOME.items():
            if x0 <= x <= x1:
                s.px(x, y, C["0"])
    # brass cap and knob
    seg(2, 13, "BBBBBB")
    seg(1, 15, "BB")
    seg(2, 17, "0")
    seg(2, 18, "0")


s = Sprite(32, 48, palette=PAL)
body()
lamp(0)
s.add_frame(copy=True)
lamp(1)
for i in (1, 2):
    s.frame(i)
    s.outline(OUTLINE, where="outside")
    lattice()
s.set_duration(400)
s.frame(1)
export(s, "beacon", light=(16, 7), fps=2)
s.stats()
