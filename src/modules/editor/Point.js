class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  delta(p) {
    return new Point(p.x - this.x, p.y - this.y);
  }

  distance(point) {
    return Math.sqrt(
      Math.pow(this.distanceX(point), 2) + Math.pow(this.distanceY(point), 2)
    );
  }

  distanceX(point) {
    return Math.abs(point.x - this.x);
  }

  distanceY(point) {
    return Math.abs(point.y - this.y);
  }

  equals(point) {
    return this.x === point.x && this.y === point.y;
  }

  center(point) {
    return new Point(
      this.x + (point.x - this.x) / 2,
      this.y + (point.y - this.y) / 2
    );
  }
}

export default Point;
