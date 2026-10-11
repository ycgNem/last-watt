"""Lamp (tier 1): 32x48, 2 frames (glass flicker), footprint 2x2.

A hooded lantern (brass hood with a visor brim, amber glass, white-hot core) held in an iron
swivel yoke on a short iron post, standing in a riveted iron foot on a squat stone slab.
The yoke says "it can aim". Light from the upper left, 1 px #10141f outline. 12 colours.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "1": "#394a50", "2": "#577277", "3": "#819796",          # iron
    "s": "#4d2b32", "S": "#7a4841", "T": "#ad7757",          # stone
    "b": "#884b2b", "B": "#be772b", "y": "#de9e41",          # brass (y doubles as glass edge)
    "Y": "#e8c170", "W": "#ebede9",                          # glass
}


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


HY = 6  # the tier-1 head sits low: a short post (lamp2 uses the headroom)


def body():
    # stone slab: top face, lit front lip, front face (chamfered corners)
    seg(38, 7, "TTTTTTTTTTSSSSSSSSs")
    for y in range(39, 42):
        seg(y, 6, "T" + "S" * 18 + "s")
    seg(42, 6, "TTTTTTTTTTTTTSSSSSSs")         # front lip catches the light
    for y in range(43, 46):
        seg(y, 6, "S" + "s" * 19)
    seg(46, 7, "s" * 18)
    # cast shadow of the foot on the slab (light from the upper left)
    for y in range(39, 42):
        seg(y, 21, "ss")
    # iron foot: top face, front face with rivets
    seg(35, 11, "3333322222")
    seg(36, 11, "3333322221")
    seg(37, 11, "2222222111")
    for y in range(38, 42):
        seg(y, 11, "2222211111")
    seg(38, 11, "3")
    seg(39, 12, "3")
    seg(39, 19, "2")
    # post
    for y in range(20 + HY, 35):
        seg(y, 14, "3221")
    # brass collar
    seg(29, 13, "yYBBbb")
    seg(30, 13, "bBBbbb")
    seg(31, 14, "1111")                         # collar shadow on the post
    # yoke: two arms and a rounded bottom bar, brass pivot bolts
    for y in range(10 + HY, 18 + HY):
        seg(y, 7, "32")
        seg(y, 23, "21")
    seg(18 + HY, 8, "3333332222222211")
    seg(19 + HY, 9, "11111111111111")
    seg(11 + HY, 7, "yB")
    seg(11 + HY, 23, "Bb")
    seg(12 + HY, 7, "Bb")
    seg(12 + HY, 23, "bb")
    seg(11 + HY, 9, "22")                       # pivot stubs into the lantern
    seg(11 + HY, 21, "11")
    # hood: knob, hipped brass cap, visor brim
    seg(1 + HY, 15, "yB")
    seg(2 + HY, 15, "Bb")
    seg(3 + HY, 13, "yYyBBb")
    seg(4 + HY, 12, "yYYyBBbb")
    seg(5 + HY, 11, "yYyyyBBBbb")
    seg(6 + HY, 10, "ByyyyyBBBBbb")
    seg(7 + HY, 10, "bbbBbbbbbbbb")
    # lantern base
    seg(15 + HY, 10, "233222221111")
    seg(16 + HY, 11, "1111111111")
    # corner posts
    for y in range(8 + HY, 15 + HY):
        seg(y, 11, "2")
        seg(y, 20, "1")


GLASS = {
    0: ["yyYYYYyy",
        "yYYWWYYy",
        "yYWWWWYy",
        "yYWWWWYy",
        "yYYWWYYy",
        "yyYYYYyy",
        "byyyyyyb"],
    1: ["yyyYYyyy",
        "yYYYYYYy",
        "yYYWWYYy",
        "yYWWWWYy",
        "yYYWWYYy",
        "yyYYYYyy",
        "byyyyyyb"],
}


def glass(f):
    for i, row in enumerate(GLASS[f]):
        seg(8 + HY + i, 12, row)


s = Sprite(32, 48, palette=PAL)
body()
glass(0)
s.add_frame(copy=True)
glass(1)
for i in (1, 2):
    s.frame(i)
    s.outline(OUTLINE, where="outside")
s.set_duration(250)
s.frame(1)
export(s, "lamp", light=(16, 11 + HY), fps=4)
s.stats()
