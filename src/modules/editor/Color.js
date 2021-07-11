class Color {
  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.alpha = a;
  }

  static fromArray(arr) {
    return new Color(...arr.slice(0, 4));
  }

  isTransparent(treshold = 0) {
    return this.alpha <= treshold;
  }

  isOpaque(treshold = 255) {
    return this.alpha >= treshold;
  }

  toString() {
    const r = this.r.toString(16).padStart(2, "0");
    const g = this.g.toString(16).padStart(2, "0");
    const b = this.b.toString(16).padStart(2, "0");
    const a = this.alpha.toString(16).padStart(2, "0");
    return `#${r}${g}${b}${a}`;
  }
}

export default Color;
