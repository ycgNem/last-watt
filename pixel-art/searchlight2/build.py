"""Searchlight (tier 2): 32x48, 2 frames (lens flicker), footprint 2x2.

Same family as the tier-1 Searchlight (three-quarter drum on a fork, thin segmented mast,
narrow stone plinth) but the drum is bigger and banded in brass instead of iron ribs, a vent
chimney stands on the barrel's back (the arc lamp's tell), and two iron struts brace the mast
from the plinth's corners, so the foot reads as a tripod. Still the tallest tower. Light from
the upper left, 1 px #10141f outline. 12 colours (as tier 1).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "0": "#202e37", "1": "#394a50", "2": "#577277", "3": "#819796",   # iron
    "s": "#4d2b32", "S": "#7a4841",                                   # stone
    "b": "#884b2b", "B": "#be772b", "y": "#de9e41",                   # brass
    "Y": "#e8c170", "W": "#ebede9",                                   # glass
}

CY = 10.0
FACE = (19.0, CY)
BACK = (11.0, CY)
RX, RY = 5.1, 7.1


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def q(cx, cy, x, y, rx=RX, ry=RY):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def base():
    seg(40, 9, "SSSSSSSSSSSSSs")
    seg(41, 8, "S" * 15 + "s")
    seg(42, 8, "S" * 15 + "s")
    for y in (43, 44, 45):
        seg(y, 8, "s" * 16)
    seg(46, 9, "s" * 14)
    seg(41, 19, "ss")
    # bracing struts from the plinth corners to the mast
    s.line(9, 40, 13, 27, C["2"])
    s.line(10, 40, 14, 28, C["1"])
    s.line(22, 40, 17, 27, C["1"])
    s.line(21, 40, 16, 28, C["0"])
    # iron foot with a brass trim band
    seg(36, 12, "yyyyBBBb")
    seg(37, 11, "3333322221")
    for y in (38, 39):
        seg(y, 11, "2222211110")
    seg(40, 11, "1111111100")
    seg(38, 12, "3")
    seg(38, 18, "2")
    # mast with flanged joints; the struts meet it at the upper flange
    for y in range(21, 36):
        seg(y, 14, "321")
    for fy in (26, 32):
        seg(fy, 13, "33221")
        seg(fy + 1, 14, "000")
    seg(21, 13, "yBBBb")
    seg(22, 13, "bbbbb")


def fork():
    seg(18, 9, "333333222222")
    seg(19, 9, "211111111110")
    seg(20, 13, "11100")
    seg(17, 20, "21")
    seg(16, 20, "21")


def near_arm():
    for y in range(11, 18):
        seg(y, 8, "210")
    seg(9, 8, "yB")
    seg(10, 7, "yYBb")
    seg(11, 7, "BBbb")
    seg(12, 8, "bb")


def drum():
    for y in range(0, 20):
        for x in range(3, 28):
            best = None
            for k in range(0, 41):
                t = k / 40
                cx = BACK[0] + (FACE[0] - BACK[0]) * t
                if q(cx, CY, x, y) <= 1.0:
                    best = t
            if best is None:
                continue
            cx = BACK[0] + (FACE[0] - BACK[0]) * best
            dy = (y - CY) / RY
            dx = (x - cx) / RX
            lit = dy + 0.35 * dx
            c = "3" if lit < -0.45 else "2" if lit < 0.15 else "1" if lit < 0.6 else "0"
            ring = best * (FACE[0] - BACK[0])
            if 1.0 < ring < 7.0 and int(ring * 10) % 25 < 8:    # brass bands
                c = "y" if lit < -0.45 else "B" if lit < 0.4 else "b"
            s.px(x, y, C[c])


def chimney():
    # vent stack on the barrel's back with a little hat
    seg(1, 9, "333221")
    seg(2, 10, "0000")
    seg(3, 10, "3221")
    seg(4, 10, "3221")


def lens(f):
    core = 0.30 if f == 0 else 0.20
    for y in range(0, 20):
        for x in range(12, 28):
            d = q(FACE[0], FACE[1], x, y)
            if d > 1.0:
                continue
            if d > 0.72:
                k = (x - FACE[0]) / RX + (y - FACE[1]) / RY
                c = "y" if k < -0.6 else "B" if k < 0.5 else "b"
            elif d < core:
                c = "W"
            elif d < 0.42:
                c = "Y" if f else "W"
            elif d < 0.58:
                c = "Y"
            else:
                c = "y"
            s.px(x, y, C[c])


s = Sprite(32, 48, palette=PAL)
for f in (0, 1):
    if f:
        s.add_frame(copy=False)
    base()
    fork()
    drum()
    chimney()
    lens(f)
    near_arm()
    s.outline(OUTLINE, where="outside")
s.set_duration(250)
s.frame(1)
export(s, "searchlight2", light=(int(FACE[0]), int(FACE[1])), fps=4)
s.stats()
