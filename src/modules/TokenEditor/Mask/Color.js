class Color {
  constructor(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.alpha = a;
  }

  static fromArray(arr) {
    return new Color(...arr.slice(0, 4));
  }

  isTransparent(minAlpha = 0) {
    return this.alpha <= minAlpha;
  }

  isOpaque(maxAlpha = 255) {
    return this.alpha >= maxAlpha;
  }

  toString() {
    return `#${this.r.toString(16)}${this.g.toString(16)}${this.b.toString(
      16
    )}${this.alpha.toString(16)}`;
  }
}

export default Color;
