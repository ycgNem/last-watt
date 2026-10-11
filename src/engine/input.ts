// Keyboard + mouse input. Edges (pressed / released) are latched per frame and cleared by endFrame.

export class Input {
  down = new Set<string>();
  pressed = new Set<string>();
  mouse = { x: 0, y: 0, down: [false, false, false], pressed: [false, false, false], released: [false, false, false], wheel: 0, moved: false };
  /** a mouse drag started at (device px) */
  dragFrom: { x: number; y: number } | null = null;
  shift = false;
  ctrl = false;

  attach(el: HTMLCanvasElement) {
    const scale = () => (el.width / el.clientWidth) || 1;
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      this.shift = e.shiftKey;
      this.ctrl = e.ctrlKey || e.metaKey;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Backquote' || e.code === 'F1') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.shift = e.shiftKey;
      this.ctrl = e.ctrlKey || e.metaKey;
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouse.down = [false, false, false];
    });
    el.addEventListener('mousemove', (e) => {
      const s = scale();
      this.mouse.x = e.offsetX * s;
      this.mouse.y = e.offsetY * s;
      this.mouse.moved = true;
    });
    el.addEventListener('mousedown', (e) => {
      if (e.button > 2) return;
      // a press lands where it happens, moved to or not (a tap on a touch screen, the first click
      // after switching windows): the last mousemove may be somewhere else
      const s = scale();
      this.mouse.x = e.offsetX * s;
      this.mouse.y = e.offsetY * s;
      this.mouse.down[e.button] = true;
      this.mouse.pressed[e.button] = true;
      if (e.button === 1) this.dragFrom = { x: this.mouse.x, y: this.mouse.y };
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button > 2) return;
      this.mouse.down[e.button] = false;
      this.mouse.released[e.button] = true;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      this.mouse.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
  }

  key(code: string) {
    return this.pressed.has(code);
  }

  held(code: string) {
    return this.down.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.pressed = [false, false, false];
    this.mouse.released = [false, false, false];
    this.mouse.wheel = 0;
    this.mouse.moved = false;
  }
}
