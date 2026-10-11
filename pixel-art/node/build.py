"""Node: 16x32, 2 frames (bulb flicker), footprint 1x1.

"A post with a light on top": a timber pole with a crossbar, two glass insulator nubs, little
diagonal braces, a stone footing, and a small warm bulb in a brass socket at the very top.
The T-shape plus the bright bulb make it findable at a glance. 1 px #10141f outline. 9 colours.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "s": "#4d2b32", "S": "#7a4841", "T": "#ad7757",     # timber
    "1": "#394a50", "2": "#577277", "3": "#a8b5b2",     # iron foot / glass insulators
    "B": "#be772b", "y": "#de9e41",                     # brass socket / bulb edge
    "Y": "#e8c170", "W": "#ebede9",                     # bulb
}


DY = 1  # sits the outline on the canvas bottom row (placement rule)


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y + DY, C[ch])


def body():
    # low bolted iron foot plate and a collar round the pole
    seg(27, 4, "22222221")
    seg(28, 4, "21111111")
    seg(29, 5, "111111")
    seg(27, 5, "3")
    seg(27, 10, "2")
    for y in (24, 25, 26):
        seg(y, 6, "2211")
    seg(24, 6, "3")
    # pole (dark timber, lit left column)
    for y in range(6, 24):
        seg(y, 7, "Ss")
    seg(15, 7, "s")    # grain break
    # crossbar, short, with a lit top edge
    seg(8, 3, "TTTTTSSSSS")
    seg(9, 3, "ssssssssss")
    # braces down to the pole
    seg(10, 5, "s")
    seg(11, 6, "s")
    seg(10, 10, "s")
    seg(11, 9, "s")
    # pin insulators standing on the bar ends
    for x in (3, 11):
        seg(5, x, "32")
        seg(6, x, "32")
        seg(7, x, ".s" if x == 3 else "s.")
    # brass socket cup under the bulb
    seg(5, 6, "yBBs")


BULB = {
    0: [".YY.", "YWWY", "YWWy", "yYyy"],
    1: [".yY.", "YWYY", "YYYy", "yyyy"],
}


def bulb(f):
    for i, row in enumerate(BULB[f]):
        seg(1 + i, 6, row)


s = Sprite(16, 32, palette=PAL)
body()
bulb(0)
s.add_frame(copy=True)
bulb(1)
for i in (1, 2):
    s.frame(i)
    s.outline(OUTLINE, where="outside")
s.set_duration(300)
s.frame(1)
export(s, "node", light=(7, 2 + DY), fps=4, preview_scale=10)
s.stats()
