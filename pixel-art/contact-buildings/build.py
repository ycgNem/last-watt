"""Buildings contact sheet: frame 1 of every building as powered / starved / dark
(pixel-art/common.py tint_states, the README maths), at 1x and at 3x, on #151d28.
A building fails if its starved and dark versions aren't tellable from powered at 1x.
The jar also shows its four charge frames (powered) at the end of each band.
Writes pixel-art/contact-buildings/contact.png. Run after the building build scripts.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import ART_OUT, tint_states  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

SLUGS = ["hearth", "lamp", "lamp2", "floodlight", "beacon", "node", "extractor", "burner",
         "jar", "lab"]
BG = (0x15, 0x1D, 0x28, 255)
LABEL = (0x81, 0x97, 0x96, 255)
GAP, GROUP_GAP, PAD, LABEL_H = 2, 10, 8, 12
FONT = ImageFont.load_default()


def frames_of(slug):
    meta = json.loads((ART_OUT / f"{slug}.json").read_text())
    sheet = Image.open(ART_OUT / f"{slug}.png").convert("RGBA")
    w, h = meta["w"], meta["h"]
    return meta, [sheet.crop((i * w, 0, (i + 1) * w, h)) for i in range(meta["frames"])]


def groups(scale):
    """One group per slug: [powered, starved, dark] of frame 1, scaled."""
    out = []
    for slug in SLUGS:
        meta, fr = frames_of(slug)
        ims = list(tint_states(fr[0], meta.get("light")))
        if slug == "jar":
            ims += fr[1:]          # charge frames 2..4, powered
        out.append((slug, [im.resize((im.width * scale, im.height * scale), Image.NEAREST)
                           for im in ims]))
    return out


def layout(gs, max_w):
    rows, row, x = [], [], 0
    for g in gs:
        gw = sum(im.width for im in g[1]) + GAP * (len(g[1]) - 1)
        if row and x + gw > max_w:
            rows.append(row)
            row, x = [], 0
        row.append((g, gw))
        x += gw + GROUP_GAP
    rows.append(row)
    return rows


def render(band_rows):
    width = max(sum(gw for _, gw in r) + GROUP_GAP * (len(r) - 1) for r in band_rows) + 2 * PAD
    heights = [max(im.height for (g, _) in r for im in g[1]) + LABEL_H for r in band_rows]
    img = Image.new("RGBA", (width, sum(heights) + PAD * (len(heights) + 1)), BG)
    d = ImageDraw.Draw(img)
    y = PAD
    for r, rh in zip(band_rows, heights):
        x = PAD
        for (slug, ims), gw in r:
            d.text((x, y), slug, fill=LABEL, font=FONT)
            for im in ims:
                img.alpha_composite(im, (x, y + rh - im.height))   # bottom-aligned, like ground
                x += im.width + GAP
            x += GROUP_GAP - GAP
        y += rh + PAD
    return img


one = render(layout(groups(1), 2000))
three = render(layout(groups(3), 1500))
sheet = Image.new("RGBA", (max(one.width, three.width), one.height + three.height), BG)
sheet.alpha_composite(one, (0, 0))
sheet.alpha_composite(three, (0, one.height))
out = Path(__file__).resolve().parent / "contact.png"
sheet.convert("RGB").save(out)
print("contact ->", out, sheet.size)
