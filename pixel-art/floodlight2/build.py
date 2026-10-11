"""Floodlight (tier 2): 32x48, 2 frames (lens flicker), footprint 2x2.

Same family as the tier-1 Floodlight (stone slab, turntable drum, broad riveted U yoke with
brass pivot bosses, finned box head) but the head is taller with a third row of lenses (3x3
instead of 3x2), framed in a brass bezel, and capped by a hood that tilts forward and juts
past the head on both sides like a brim. The drum gets a brass band. Tier 1 is a wide low
box; tier 2 is a tall square lantern-bank with a hat. 1 px #10141f outline. 12 colours.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "0": "#202e37", "1": "#394a50", "2": "#577277", "3": "#819796",   # iron
    "c": "#a8b5b2",                                                   # cool lens rim
    "s": "#4d2b32", "S": "#7a4841",                                   # stone
    "B": "#be772b", "y": "#de9e41",                                   # brass / lens edge
    "Y": "#e8c170", "W": "#ebede9",                                   # lens
}


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def body():
    # stone slab (as tier 1)
    seg(40, 6, "SSSSSSSSSSSSSSSSSSSs")
    seg(41, 5, "S" * 21 + "s")
    seg(42, 5, "S" * 21 + "s")
    for y in range(43, 46):
        seg(y, 5, "s" * 22)
    seg(46, 6, "s" * 20)
    seg(42, 23, "ss")
    # turntable drum, shorter than tier 1, with a brass band
    seg(35, 10, "333333332222")
    seg(36, 9, "33333332222221")
    seg(37, 9, "yyyyyyyyBBBBBB")
    for y in range(38, 42):
        seg(y, 9, "32222211111110")
    for x in (10, 13, 16, 19, 22):
        seg(39, x, "3" if x < 16 else "2")
    seg(41, 9, "11111111111100")
    seg(34, 13, "322110")                   # neck
    # yoke: broad U, rivets, brass pivot bosses at the head's mid-height
    for y in range(12, 32):
        seg(y, 1, "321")
        seg(y, 28, "210")
    seg(11, 2, "32")
    seg(11, 28, "21")
    seg(32, 1, "3" * 8 + "2" * 16 + "1" * 4 + "10")
    seg(33, 2, "1" * 27 + "0")
    for y in (14, 28):
        seg(y, 2, "3")
        seg(y, 29, "2")
    for x in range(5, 28, 4):
        seg(32, x, "3" if x < 16 else "2")
    seg(19, 1, "yBB")
    seg(20, 1, "BBo")
    seg(19, 28, "BBB")
    seg(20, 28, "oBo")
    # hood: a plate tilted forward over the lid, wider than the head (the tier-2 brim)
    seg(1, 6, "2" * 20)
    seg(2, 4, "3" * 14 + "2" * 9 + "1")
    seg(3, 2, "y" * 16 + "B" * 12)
    seg(4, 5, "0" * 22)
    # lid with cooling fins
    seg(5, 5, "3232323232323232222221"[:22])
    seg(6, 5, "3232323232323232222221"[:22])
    seg(7, 5, "3333333333333332222221"[:22])
    # head front: brass bezel round an iron plate
    seg(8, 5, "yyyyyyyyyyyyyyyBBBBBBB")
    for y in range(9, 31):
        seg(y, 5, "y" + "1" * 20 + "B")
    seg(31, 5, "BBBBBBBBBBBBBBBBBBBBBB")
    seg(9, 6, "0" * 20)                     # shadow under the bezel's top bar


CELL = {
    "hot": [".cYYy.",
            "cWWWYy",
            "YWWWYy",
            "YWWYYy",
            "yYYYyB",
            ".yyyB."],
    "warm": [".cYyy.",
             "cYWYYy",
             "YWWYyy",
             "YYYYyy",
             "yYYyyB",
             ".yyBB."],
}
CX = (6, 13, 20)
CY = (10, 17, 24)


def lenses(f):
    for j, cy in enumerate(CY):
        for i, cx in enumerate(CX):
            hot = ((i + j + f) % 2 == 0)
            for r, line in enumerate(CELL["hot" if hot else "warm"]):
                seg(cy + r, cx, line)


s = Sprite(32, 48, palette=PAL)
body()
lenses(0)
s.add_frame(copy=True)
lenses(1)
for i in (1, 2):
    s.frame(i)
    s.outline(OUTLINE, where="outside")
s.set_duration(260)
s.frame(1)
export(s, "floodlight2", light=(16, 20), fps=4)
s.stats()
