"""Rebuild every sprite: runs each pixel-art/<slug>/build.py (cwd = that folder), the contact
sheet (pixel-art/contact/build.py) last, and reports failures. Exit code 1 if any failed.

    python3 pixel-art/build_all.py            # everything
    python3 pixel-art/build_all.py moth tiles # just these slugs
"""
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAST = "contact-buildings"


def main(argv):
    scripts = sorted(p for p in HERE.glob("*/build.py"))
    if argv:
        scripts = [p for p in scripts if p.parent.name in argv]
    # contact sheets read the other exports, so they run last
    scripts.sort(key=lambda p: (p.parent.name.startswith(LAST), p.parent.name))
    failed = []
    for p in scripts:
        slug = p.parent.name
        t0 = time.time()
        r = subprocess.run([sys.executable, "build.py"], cwd=p.parent, capture_output=True,
                           text=True)
        dt = time.time() - t0
        if r.returncode == 0:
            print(f"  ok    {slug:<14} {dt:5.1f}s")
        else:
            failed.append(slug)
            print(f"  FAIL  {slug:<14} {dt:5.1f}s")
            tail = (r.stderr or r.stdout).strip().splitlines()[-12:]
            for line in tail:
                print(f"        {line}")
    print(f"{len(scripts) - len(failed)}/{len(scripts)} built" +
          (f"; failed: {', '.join(failed)}" if failed else ""))
    if not (HERE / LAST / "build.py").exists():
        print(f"  note: no {LAST}/build.py yet (contact sheet not built)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
