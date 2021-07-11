/**
 * A Viewport is a square in a given area with max dimensions in each direction
 * It has a center point, a top, left, bottom and right coord and a size
 */
class ViewPort {
  constructor(center, dimension) {
    this.center = center;
    this.dimension = dimension;
    this.size = Math.min(this.dimension.width, this.dimension.height);
    this.left = this.center.x - this.size / 2;
    this.right = this.center.x + this.size / 2;
    this.top = this.center.y - this.size / 2;
    this.bottom = this.center.y + this.size / 2;
  }

  boundingBox(zoomFactor) {
    return [
      this.center.x - (this.dimension.width * zoomFactor) / 2,
      this.center.y - (this.dimension.height * zoomFactor) / 2,
      this.center.x + (this.dimension.width * zoomFactor) / 2,
      this.center.y + (this.dimension.height * zoomFactor) / 2,
    ];
  }

  square() {
    return;
  }
}

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
    return `#${this.r.toString(16)}${this.g.toString(16)}${this.b.toString(
      16
    )}${this.alpha.toString(16)}`;
  }
}

export default ViewPort;
