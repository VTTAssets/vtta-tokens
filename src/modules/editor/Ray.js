import Point from "./Point.js";
import Mask from "./Mask.js";

class Ray {
  constructor(start, end) {
    this.start = start;
    this.end = end;

    this.pixels = this.getPixelsCoordinates();
    this.pixel = null;

    this.segments = null;
  }

  isAnalyzed() {
    return this.segments !== null;
  }

  getPixelsCoordinates() {
    const pixels = [];
    let x = Math.floor(this.start.x);
    let y = Math.floor(this.start.y);
    const xx = Math.floor(this.end.x);
    const yy = Math.floor(this.end.y);
    const dx = Math.abs(xx - x);
    const sx = x < xx ? 1 : -1;
    const dy = -Math.abs(yy - y);
    const sy = y < yy ? 1 : -1;
    let err = dx + dy;
    let e2;
    let end = false;

    while (!end) {
      pixels.push(new Point(x, y));

      if (x === xx && y === yy) {
        end = true;
      } else {
        e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y += sy;
        }
      }
    }
    return pixels;
  }

  analyze(imageData) {
    this.pixels = this.pixels.map((point) => imageData.getPixel(point));
    this.segments = [];

    let startIndex = null;
    let endIndex = null;

    this.pixels.forEach((pixel, index) => {
      if (pixel.isOpaque()) {
        if (startIndex === null) {
          startIndex = index;
        } else {
          endIndex = index;
        }
      } else {
        // save segment
        if (endIndex !== null) {
          this.segments.push({
            start: startIndex,
            end: endIndex,
            length: endIndex - startIndex,
            pixels: this.pixels.slice(startIndex, endIndex + 1),
          });

          // reset
          startIndex = null;
          endIndex = null;
        }
      }

      // find the first opaqu-ish pixel
      if (pixel.isOpaque(Mask.MINIMUM_ALPHA)) {
        this.pixel =
          this.pixel === null || this.pixel.color.alpha < pixel.color.alpha
            ? pixel
            : this.pixel;
      }
    });

    if (startIndex !== null && endIndex === null) {
      this.segments.push({
        start: startIndex,
        end: this.pixels.length - 1,
        length: this.pixels.length - 1 - startIndex,
        pixels: this.pixels.slice(startIndex, this.pixels.length),
      });

      // reset
      startIndex = null;
      endIndex = null;
    }

    return this;
  }
}

export default Ray;
