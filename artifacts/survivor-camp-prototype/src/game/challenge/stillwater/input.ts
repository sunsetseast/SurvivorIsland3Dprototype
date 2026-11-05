/** Pointer ownership independent of the exploration joystick. Tested with real event sequences too. */
export class BalanceInput {
  balancePointer: number | null = null;
  placementPointer: number | null = null;
  value = 0;
  sensitivity = 1;
  private origin = 0;
  private span = 100;
  private keys = new Set<string>();
  constructor(private axis: (value: number) => void, private place: () => void) {}
  private emit(v: number) { this.value = Math.max(-1, Math.min(1, v)); this.axis(this.value); }
  down(id: number, x: number, width: number) { if (this.balancePointer !== null || id === this.placementPointer) return false; this.balancePointer = id; this.origin = x; this.span = Math.max(35, width * .38); this.keys.clear(); this.emit(0); return true; }
  move(id: number, x: number) { if (id === this.balancePointer) this.emit((x - this.origin) / this.span * this.sensitivity); }
  up(id: number) { if (id === this.balancePointer) { this.balancePointer = null; this.emit(0); } if (id === this.placementPointer) this.placementPointer = null; }
  placeDown(id: number) { if (this.placementPointer !== null || id === this.balancePointer) return false; this.placementPointer = id; return true; }
  placeUp(id: number, inside: boolean) { if (id !== this.placementPointer) return; this.placementPointer = null; if (inside) this.place(); }
  key(code: string, down: boolean, repeat = false) {
    if (!["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyW", "KeyS", "ArrowUp", "ArrowDown"].includes(code)) return false;
    if (down) { if (code === "Space" && !repeat && !this.keys.has(code)) this.place(); this.keys.add(code); } else this.keys.delete(code);
    if (this.balancePointer === null) this.emit((Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"))) * this.sensitivity);
    return true;
  }
  reset() { this.balancePointer = this.placementPointer = null; this.keys.clear(); this.emit(0); }
}
