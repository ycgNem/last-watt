"""Beacon (tier 2): 32x48, 2 frames (the dome and the marker lamps pulse in turn), footprint 2x2.

Same family as the tier-1 Beacon (tall narrow lattice mast, bolted foot, stone pad, caged
red-amber dome under a brass cap) but the dome is bigger and sits on a railed gallery deck,
the cap carries a lightning-rod finial, and a yardarm crosses the mast with a red marker lamp
hanging from each end. The yardarm turns the tier-1 needle into a cross, so the upgrade reads
by silhouette. Frame 1: dome up, markers down; frame 2: dome down, markers up, cage turned.
Red identity, not the Lamp's amber. 1 px #10141f outline. 12 colours (as tier 1).
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
    "B": "#be772b",                                                    # brass
}


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


XB_L, XB_R, XT_L, XT_R = 10, 21, 13, 18   # rail x at the foot and under the gallery
Y_BOT, Y_TOP = 38, 16


def rail_x(y, x_bot, x_top):
    return round(x_bot + (x_top - x_bot) * (Y_BOT - y) / (Y_BOT - Y_TOP))


def body():
    # stone pad and bolted foot (a touch wider than tier 1)
    seg(41, 8, "SSSSSSSSSSSSSSSs")
    seg(42, 7, "S" * 17 + "s")
    seg(43, 7, "S" * 17 + "s")
    for y in (44, 45):
        seg(y, 7, "s" * 18)
    seg(46, 8, "s" * 16)
    seg(38, 9, "22222222222221")
    seg(39, 9, "21111111111110")
    seg(40, 9, "11111111111100")
    seg(39, 10, "B")
    seg(39, 21, "B")
    # collar under the gallery
    seg(16, 12, "22221111")
    # gallery deck: lit top, dark front edge, railing posts outside the dome
    seg(13, 8, "2222222222111111")
    seg(14, 7, "222222222211111110")
    seg(15, 8, "0000000000000000")
    for x, c in ((7, "2"), (24, "1")):
        for y in range(10, 14):
            seg(y, x, c)
    seg(10, 7, "22")
    seg(10, 23, "11")
    # yardarm across the mast with a marker lamp hanging from each end
    seg(24, 4, "2222222222211111111111111"[:24])
    seg(25, 5, "0000000000000000000000")
    seg(23, 4, "2")
    seg(23, 27, "1")


def markers(f):
    ramp = ["R", "r"] if f == 0 else ["Y", "a"]
    for x0 in (3, 26):
        seg(25, x0, "BB")
        seg(26, x0, ramp[0] + ramp[1])
        seg(27, x0, ramp[1] + ramp[1])
        seg(28, x0, "mm"[:2] if f == 0 else "rr")


def lattice():
    levels = [37, 31, 25, 21, 17]
    for i, ly in enumerate(levels):
        xl, xr = rail_x(ly, XB_L, XT_L), rail_x(ly, XB_R, XT_R)
        s.line(xl, ly, xr, ly, C["B" if ly == 31 else "1"])          # one brass band
        if i + 1 < len(levels):
            ny = levels[i + 1]
            if i % 2 == 0:
                s.line(xl + 1, ly - 1, rail_x(ny, XB_R, XT_R) - 1, ny + 1, C["1"])
            else:
                s.line(xr - 1, ly - 1, rail_x(ny, XB_L, XT_L) + 1, ny + 1, C["1"])
    for y in range(17, 38):
        xl, xr = rail_x(y, XB_L, XT_L), rail_x(y, XB_R, XT_R)
        s.px(xl, y, C["2"])
        s.px(xr, y, C["1"])
        for x in (xl - 1, xr + 1):
            if s.get(x, y) is None:
                s.px(x, y, OUTLINE)


GLASS = {
    0: {"ramp": ["Y", "a", "R", "r"], "bars": (12, 19)},
    1: {"ramp": ["R", "r", "r", "m"], "bars": (10, 15, 16, 21)},
}
DOME = {4: (13, 18), 5: (11, 20), 6: (10, 21), 7: (10, 21), 8: (10, 21), 9: (10, 21),
        10: (10, 21), 11: (11, 20), 12: (12, 19)}


def lamp(f):
    g = GLASS[f]
    for y, (x0, x1) in DOME.items():
        for x in range(x0, x1 + 1):
            d = math.hypot((x - 15.5) / 5.6, (y - 8.0) / 4.6)
            k = 0 if d < 0.38 else 1 if d < 0.66 else 2 if d < 0.92 else 3
            s.px(x, y, C[g["ramp"][k]])
    for x in g["bars"]:
        for y, (x0, x1) in DOME.items():
            if x0 <= x <= x1:
                s.px(x, y, C["0"])
    # brass cap, knob and lightning-rod finial
    seg(3, 12, "BBBBBBBB")
    seg(2, 14, "BBBB")
    seg(3, 18, "00")
    seg(1, 15, "2")


s = Sprite(32, 48, palette=PAL)
for f in (0, 1):
    if f:
        s.add_frame(copy=False)
    body()
    markers(f)
    lamp(f)
    s.outline(OUTLINE, where="outside")
    lattice()
s.set_duration(400)
s.frame(1)
export(s, "beacon2", light=(16, 8), fps=2)
s.stats()
