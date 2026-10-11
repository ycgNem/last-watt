"""Extractor: 16x24, 2 frames (hammer up / hammer down), footprint 1x1.

An iron A-frame drop-hammer rig standing on an emberrock mound, with a brass pulley at the apex
and an ember-glowing bore hole at its foot. Frame 2 drops the hammer into the hole: the hole
flares and two sparks jump. 1 px #10141f outline. 12 colours.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "q": "#241527", "k": "#341c27", "K": "#602c2c",           # emberrock
    "r": "#cf573c", "a": "#da863e", "Y": "#e8c170",           # glow / glints
    "1": "#394a50", "2": "#577277", "3": "#819796",           # iron
    "B": "#be772b", "y": "#de9e41",                           # brass pulley
}

ROCK = [
    (15, "....KKKKKkk....."),
    (16, "..KKKKKKKKkkkk.."),
    (17, ".KKKKKKKKKKkkkk."),
    (18, ".KKKKKKKKKkkkkk."),
    (19, ".KKKKKKKkkkkkkq."),
    (20, ".kkkkkkkkkkkkqq."),
    (21, "..qkkkkkkkkqqq.."),
    (22, "...qqqqqqqqqq..."),
]


def row(y, text, x0=0):
    for i, ch in enumerate(text):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def base():
    for y, t in ROCK:
        row(y, t)
    for (x, y, c) in ((3, 17, "r"), (12, 18, "a"), (2, 20, "r"), (11, 21, "r")):
        row(y, c, x)
    # legs: two thin iron rails splayed wide (lit left rail)
    s.line(1, 19, 5, 4, C["3"])
    s.line(14, 19, 10, 4, C["1"])
    # feet plates
    row(19, "32", 1)
    row(19, "21", 13)
    # cross brace behind the hammer
    row(12, "2222111", 4)
    # head beam with the brass pulley wheel on it
    row(3, "22222111", 4)
    row(4, "11111111", 4)
    row(1, "yB", 7)
    row(2, "yBBB", 6)


def hole(f):
    row(17, "qqqq", 6)
    row(18, "qraarq" if f == 0 else "qaYYaq", 5)
    row(19, "KrYYrK" if f == 0 else "KYYYYK", 5)
    row(20, "kKKk", 6)


def hammer(f):
    top = 8 if f == 0 else 13
    for y in range(3, top):
        row(y, "3", 7)                 # the lifting rod, lit
    row(top, "3322", 6)
    row(top + 1, "2211", 6)
    row(top + 2, "1qqq" if f == 0 else "1kkk", 6)
    if f == 1:
        row(15, "Y", 3)    # sparks off the strike
        row(14, "Y", 12)


s = Sprite(16, 24, palette=PAL)
for f in (0, 1):
    if f:
        s.add_frame(copy=False)
    base()
    hole(f)
    hammer(f)
    s.outline(OUTLINE, where="outside")
s.set_duration(300)
s.frame(1)
export(s, "extractor", light=(7, 18), fps=3, preview_scale=10)
s.stats()
