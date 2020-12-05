import Point from "./Point.js";
import Pixel from "./Pixel.js";
import Color from "./Color.js";

class ImageData {
  constructor(imageData) {
    this.data = imageData.data;
    this.width = imageData.width;
    this.height = imageData.height;
  }

  getPixel(point) {
    const index = point.x + point.y * this.width;
    const arr = [
      this.data[index * 4],
      this.data[index * 4 + 1],
      this.data[index * 4 + 2],
      this.data[index * 4 + 3],
    ];
    const color = Color.fromArray(arr);
    return Pixel.fromPoint(point, color);
  }

  getBorderColor() {
    const pixels = [];
    for (let x = 0; x < this.width; x++) {
      pixels.push(this.getPixel(new Point(x, 0)));
      pixels.push(this.getPixel(new Point(x, this.height - 1)));
    }
    for (let y = 0; y < this.height; y++) {
      pixels.push(this.getPixel(new Point(0, y)));
      pixels.push(this.getPixel(new Point(this.width - 1, y)));
    }
    const filteredPixels = pixels.filter((pixel) => pixel.color.alpha === 255);
    const sumSquared = filteredPixels.reduce(
      (color, pixel) => {
        color.r += Math.pow(pixel.color.r, 2);
        color.g += Math.pow(pixel.color.g, 2);
        color.b += Math.pow(pixel.color.b, 2);
        return color;
      },
      { r: 0, g: 0, b: 0 }
    );

    return new Color(
      Math.round(Math.sqrt(sumSquared.r / pixels.length)),
      Math.round(Math.sqrt(sumSquared.g / pixels.length)),
      Math.round(Math.sqrt(sumSquared.b / pixels.length)),
      255
    );
  }
}

export default ImageData;
