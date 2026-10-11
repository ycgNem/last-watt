"""Floodlight: 32x48, 2 frames (lens flicker), footprint 2x2.

A wide, heavy box head with a 3x2 grid of lens cells (white-hot centres falling off to amber,
a cool iron-white rim on each cell's lit corner) and cooling fins on its lid, held at the sides
in a broad riveted iron yoke with brass pivot bosses, on a turntable drum and a stone slab.
Wide and low next to the Lamp. Light from the upper left, 1 px #10141f outline. 12 colours.
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
    # stone slab
    seg(40, 6, "SSSSSSSSSSSSSSSSSSSs")
    seg(41, 5, "S" * 21 + "s")
    seg(42, 5, "S" * 21 + "s")
    for y in range(43, 46):
        seg(y, 5, "s" * 22)
    seg(46, 6, "s" * 20)
    seg(42, 23, "ss")                       # drum shadow on the slab
    # turntable drum: lit top, riveted band
    seg(33, 10, "333333332222")
    seg(34, 9, "33333332222221")
    seg(35, 9, "22222222222111")
    for y in range(36, 42):
        seg(y, 9, "32222211111110")
    for x in (10, 13, 16, 19, 22):
        seg(38, x, "3" if x < 16 else "2")
    seg(41, 9, "11111111111100")
    # neck from the yoke into the drum
    for y in (31, 32):
        seg(y, 13, "322110")
    # yoke: broad U, rivets, brass pivot bosses
    for y in range(13, 29):
        seg(y, 1, "321")
        seg(y, 28, "210")
    seg(12, 2, "32")
    seg(12, 28, "21")
    seg(29, 1, "3333333322222222222222221111"[:28] + "10")
    seg(30, 2, "1111111111111111111111111110")
    for y in (15, 24):
        seg(y, 2, "3")
        seg(y, 29, "2")
    for x in range(5, 28, 4):
        seg(29, x, "3" if x < 16 else "2")
    seg(18, 1, "yBB")
    seg(19, 1, "BBo")
    seg(18, 28, "Bb"[0] + "BB")
    seg(19, 28, "oBo")
    # head: lid with cooling fins
    seg(7, 6, "22222222222222222222")
    seg(8, 5, "3232323232323232222221"[:22])
    seg(9, 5, "3232323232323232222221"[:22])
    seg(10, 5, "2222222222222222222111"[:22])
    seg(11, 5, "3333333333333332222221"[:22])   # front lip of the lid
    # head front: frame round the lens grid
    for y in range(12, 27):
        seg(y, 5, "2" + "1" * 20 + "0")
    seg(12, 6, "0" * 20)                    # shadow under the lid lip
    seg(26, 5, "1" + "1" * 20 + "0")
    seg(27, 6, "00000000000000000000")


CELL = {
    # 6x6 round lens set in the face plate: cool glint on the lit rim, white-hot centre,
    # amber falloff, brass bezel shadow at the lower right ('.' leaves the plate showing)
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
CY = (13, 20)


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
export(s, "floodlight", light=(16, 19), fps=4)
s.stats()
