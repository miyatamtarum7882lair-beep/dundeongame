/** Locks input after a confirmed action while the erection state is active. */
export class InputGate {
  constructor({ lockSec, isActive }) {
    this.lockSec = lockSec;
    this.isActive = isActive;
    this.left = 0;
  }

  canAct() {
    return this.left <= 0;
  }

  onAction(busySec = 0) {
    if (!this.isActive()) return;
    this.left = Math.max(this.left, Math.max(0, busySec) + this.lockSec);
  }

  update(dtSec) {
    if (this.left > 0) this.left = Math.max(0, this.left - Math.max(0, dtSec));
  }

  clear() {
    this.left = 0;
  }
}
