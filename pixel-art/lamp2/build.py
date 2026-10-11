"""Lamp (tier 2): 32x48, 2 frames (lens flicker), footprint 2x2.

Same family as the tier-1 Lamp (stone slab, riveted iron foot, iron post, swivel yoke) but
taller and crowned with a big round lens set in a brass reflector dish with an iron visor,
and a whiter core. Tier 1 is a boxy lantern held low; tier 2 is a wide disc held high, so the
upgrade reads by silhouette, not by recolour. 1 px #10141f outline. 12 colours (as tier 1).
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "1": "#394a50", "2": "#577277", "3": "#819796",          # iron
    "s": "#4d2b32", "S": "#7a4841", "T": "#ad7757",          # stone
    "b": "#884b2b", "B": "#be772b", "y": "#de9e41",          # brass
    "Y": "#e8c170", "W": "#ebede9",                          # glass
}
HX, HY = 15.5, 12.0   # lens centre


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def base():
    # stone slab (same as tier 1)
    seg(38, 7, "TTTTTTTTTTSSSSSSSSs")
    for y in range(39, 42):
        seg(y, 6, "T" + "S" * 18 + "s")
    seg(42, 6, "TTTTTTTTTTTTTSSSSSSs")
    for y in range(43, 46):
        seg(y, 6, "S" + "s" * 19)
    seg(46, 7, "s" * 18)
    for y in range(39, 42):
        seg(y, 21, "ss")
    # iron foot with a brass trim band (the upgrade's tell at ground level)
    seg(35, 11, "yyyyyBBBBb")
    seg(36, 11, "3333322221")
    seg(37, 11, "2222222111")
    for y in range(38, 42):
        seg(y, 11, "2222211111")
    seg(38, 11, "3")
    seg(39, 12, "3")
    seg(39, 19, "2")
    # tall post with two brass collars
    for y in range(23, 35):
        seg(y, 14, "3221")
    for cy in (26, 31):
        seg(cy, 13, "yYBBbb")
        seg(cy + 1, 13, "bBBbbb")
        seg(cy + 2, 14, "1111")
    # yoke: wider arms reaching the lens' horizontal diameter
    for y in range(12, 22):
        seg(y, 4, "32")
        seg(y, 26, "21")
    seg(22, 5, "3333333332222222221111"[:22])
    seg(23, 6, "11111111111111111111")
    seg(12, 4, "yB")
    seg(12, 26, "Bb")
    seg(13, 4, "Bb")
    seg(13, 26, "bb")


def drum():
    """The lamp body behind the dish: a finned iron drum whose back shows above the rim."""
    seg(1, 11, "3333322222")
    for y in range(2, 9):
        fin = (y % 2 == 0)
        seg(y, 10, ("33" if not fin else "22") + ("2" * 5 if not fin else "1" * 5)
            + ("1" * 4 if not fin else "o" * 4) + "o")


def head(f):
    core = 2.4 if f == 0 else 1.9
    for y in range(0, 22):
        for x in range(4, 28):
            dx, dy = x - HX, y - HY
            d = math.hypot(dx, dy)
            if d <= core:
                c = "W"
            elif d <= 4.1:
                c = "Y" if f == 0 or d > 2.6 else "W"
            elif d <= 5.3:
                c = "y"
            elif d <= 6.4:
                c = "1"                                   # dark bezel ring
            elif d <= 7.9:
                k = dx + dy                               # reflector lit from the upper left
                c = "Y" if k < -6 else "y" if k < -1 else "B" if k < 5 else "b"
            else:
                continue
            seg(y, x, c)
    # pivot stubs from the yoke into the dish
    seg(12, 6, "2")
    seg(12, 25, "1")
    # a glint on the lens' lit rim
    seg(9, 12, "W")
    seg(8, 13, "W")


s = Sprite(32, 48, palette=PAL)
for f in (0, 1):
    if f:
        s.add_frame(copy=False)
    base()
    drum()
    head(f)
    s.outline(OUTLINE, where="outside")
s.set_duration(250)
s.frame(1)
export(s, "lamp2", light=(16, 12), fps=4)
s.stats()
