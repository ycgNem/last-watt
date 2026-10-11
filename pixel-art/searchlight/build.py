"""Searchlight: 32x48, 2 frames (lens flicker), footprint 2x2.

A big drum lamp seen at three-quarters (yawed 45 degrees to the right): the ribbed iron barrel
to the left, the bright lens face as an upright oval at the front right, held in a fork yoke
whose near arm crosses the barrel to a brass trunnion boss. The fork stands on a long thin
segmented iron mast in a small foot on a narrow stone plinth: the tallest, thinnest tower.
The head is asymmetric on purpose (Lamp 2 is a frontal disc). Light from the upper left,
1 px #10141f outline. 12 colours.
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

CY = 8.0                  # drum centre height
FACE = (19.0, CY)         # lens face centre (the light anchor)
BACK = (11.5, CY)         # back of the barrel
RX, RY = 4.7, 6.6         # lens face ellipse (the drum's circle seen at 45 degrees)


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def q(cx, cy, x, y, rx=RX, ry=RY):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def base():
    # narrow stone plinth: top face, lit lip, front face
    seg(40, 9, "SSSSSSSSSSSSSs")
    seg(41, 8, "S" * 15 + "s")
    seg(42, 8, "S" * 15 + "s")
    for y in (43, 44, 45):
        seg(y, 8, "s" * 16)
    seg(46, 9, "s" * 14)
    seg(41, 19, "ss")                          # foot shadow on the plinth
    # iron foot: stepped, riveted
    seg(36, 12, "33332222")
    seg(37, 11, "3333322221")
    for y in (38, 39):
        seg(y, 11, "2222211110")
    seg(40, 11, "1111111100")
    seg(38, 12, "3")
    seg(38, 18, "2")
    # long thin mast with two flanged joints
    for y in range(19, 36):
        seg(y, 14, "321")
    for fy in (24, 31):
        seg(fy, 13, "33221")
        seg(fy + 1, 14, "000")
    # brass collar under the fork
    seg(19, 13, "yBBBb")
    seg(20, 13, "bbbbb")


def fork():
    # U base under the drum (a horizontal bar: the trunnion axis runs left-right on screen)
    seg(16, 9, "333333222222")
    seg(17, 9, "211111111110")
    seg(18, 13, "11100")                       # stem into the collar
    # far arm: its foot shows under the lens, the rest hides behind the drum
    seg(15, 19, "21")
    seg(14, 19, "21")


def near_arm():
    # near arm crosses in front of the barrel up to the brass trunnion boss
    for y in range(9, 16):
        seg(y, 9, "210")                       # arm, with its shadow on the barrel
    seg(7, 9, "yB")
    seg(8, 8, "yYBb")
    seg(9, 8, "BBbb")
    seg(10, 9, "bb")


def drum():
    """Barrel = the lens ellipse swept from BACK to FACE; each pixel takes the frontmost
    cross-section it lies inside, which gives the ring ribs for free."""
    for y in range(0, 18):
        for x in range(4, 27):
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
            lit = dy + 0.35 * dx                      # light from the upper left
            c = "3" if lit < -0.45 else "2" if lit < 0.15 else "1" if lit < 0.6 else "0"
            ring = best * (FACE[0] - BACK[0])
            if 1.0 < ring < 6.0 and int(ring * 10) % 20 < 7:   # three cooling ribs
                c = {"3": "2", "2": "1", "1": "0", "0": "0"}[c]
            s.px(x, y, C[c])


def lens(f):
    core = 0.30 if f == 0 else 0.20
    for y in range(0, 18):
        for x in range(12, 27):
            d = q(FACE[0], FACE[1], x, y)
            if d > 1.0:
                continue
            if d > 0.70:                               # brass bezel, lit upper left
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
    lens(f)
    near_arm()
    s.outline(OUTLINE, where="outside")
s.set_duration(250)
s.frame(1)
export(s, "searchlight", light=(int(FACE[0]), int(FACE[1])), fps=4)
s.stats()
