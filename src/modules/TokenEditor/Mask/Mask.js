import Point from "./Point.js";
import Ray from "./Ray.js";
import ImageData from "./ImageData.js";

class Mask {
  static DEFAULT_SAMPLE_SIZE = 5;
  static MINIMUM_ALPHA = 255;

  constructor(image) {
    const data = Mask.processImage(image);
    // the drawn image
    this.canvas = data.canvas;
    // the pixel image data
    this.imageData = data.imageData;

    this.width = this.imageData.width;
    this.height = this.imageData.height;

    this.output = document.createElement("canvas");
    this.output.width = this.width;
    this.output.height = this.height;

    this.center = new Point(this.width / 2, this.height / 2);

    this.rays = [];

    return this.create();
  }

  static processImage(image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return {
      canvas,
      imageData: new ImageData(
        canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
      ),
    };
  }

  create() {
    const startPoint = new Point(this.center.x, 0);
    const endPoint = new Point(this.center.x - 1, 0);
    this.rays = this.createRays(startPoint, endPoint, Mask.DEFAULT_SAMPLE_SIZE);

    const context = this.output.getContext("2d");

    const outline = this.rays
      .filter((ray) => ray.pixel !== null)
      .map((ray) => ray.pixel);

    let distances = outline
      .map((pixel) => new Point(pixel.x, pixel.y))
      .map((point) => point.distance(this.center));

    distances = distances.sort((a, b) => a - b);

    const stats = {
      mean: distances[Math.round(distances.length / 2)],
      min: distances[0],
      max: distances[distances.length - 1],
    };

    console.log(
      `Distances - min: ${stats.min}, max: ${stats.max}, mean: ${stats.mean}`
    );
    const radius = stats.max;

    context.beginPath();
    context.fillStyle = "red";
    context.arc(this.center.x, this.center.y, radius, 0, 2 * Math.PI, false);
    context.fill();

    context.beginPath();
    context.fillStyle = "black";

    outline.forEach((pixel, index) => {
      if (index === 0) {
        context.moveTo(pixel.x, pixel.y);
      } else {
        context.lineTo(pixel.x, pixel.y);
      }
    });
    context.closePath();
    context.fill();

    return this.output;
    // return {
    //   canvas: this.output,
    //   center: this.center,
    //   radius: radius,
    // };
  }

  /**
   * Gets the coordinate of the n-th point on the border, starting in the top-left and going
   * clockwise around the canvas
   * @param {Number} index The index of the point requested
   * top-left and going clockwise
   */
  getBorderPoint(index) {
    let pos = index;
    if (pos < this.width - 1) {
      return new Point(pos, 0);
    }
    pos -= this.width - 1;
    if (pos < this.height - 1) {
      return new Point(this.width - 1, pos);
    }
    pos -= this.height - 1;
    if (pos < this.width) {
      return new Point(this.width - 1 - pos, this.height - 1);
    }
    pos -= this.width - 1;
    return new Point(0, this.height - 1 - pos);
  }

  /**
   * Gets all border points and creates the pixel information for rays with the default sample size
   */
  createRays() {
    const len = 2 * this.width + 2 * (this.height - 2);
    let rays = [];
    for (let index = 0; index < len; index++) {
      let ray = new Ray(this.center, this.getBorderPoint(index));
      if (index % Mask.DEFAULT_SAMPLE_SIZE === 0) {
        ray = ray.analyze(this.imageData);

        /*
         * For calculating the final mask, we can have three results:
         * 1) There is no opaque pixel found, not even a opaquish (below the minimum alpha threshold) pixel
         * 2) There is no true opaque pixel found, but an opaquish one
         * 3) There is a true opaque pixel found
         *
         * 3 is the most desired one, and the most uncomplicated one: we just take that one. We still might calculate some intermediate pixels to get it right, but we try with this one first
         */

        // react to analyze fails
        if (ray.pixel === null) {
          // ramp up the sample by analyzing all previously non-analyzed rays
          // if there still is no result, then so be it
          let i = 1;
          while (
            rays[index - i] !== undefined &&
            !rays[index - i].isAnalyzed()
          ) {
            console.log("Analyzing missed index #" + (index - i));
            rays[index - i] = rays[index - i].analyze(this.imageData);
            i++;
          }
        }
      }
      // we push this ray either case
      rays.push(ray);
    }

    return rays;
  }
}

export default Mask;
