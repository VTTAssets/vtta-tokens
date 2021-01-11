class Pixel {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  static fromPoint(p, color) {
    return new Pixel(p.x, p.y, color);
  }

  isTransparent(minAlpha = 0) {
    return this.color.isTransparent(minAlpha);
  }

  isOpaque(maxAlpha = 255) {
    return this.color.isOpaque(maxAlpha);
  }
}

export default Pixel;
