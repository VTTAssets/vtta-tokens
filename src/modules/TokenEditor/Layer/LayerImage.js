import config from "../../../config/index.js";
import CONSTANTS from "../constants.js";
import Mask from "../Mask/Mask.js";
import ImageData from "../Mask/ImageData.js";

const TO_RADIANS = Math.PI / 180;

class LayerImage {
  static OUTLINE_SIZE = 36;

  constructor(data, size) {
    this.data = data;

    this.center = {
      x: size / 2,
      y: size / 2,
    };

    this.canvas = document.createElement("canvas");
    this.canvas.width = data.naturalWidth ? data.naturalWidth : data.width;
    this.canvas.height = data.naturalHeight ? data.naturalHeight : data.height;

    this.ctx = this.canvas.getContext("2d");

    this.outline = document.createElement("canvas");
    this.outline.classList.add("outline");
    this.outline.width = LayerImage.OUTLINE_SIZE;
    this.outline.height = LayerImage.OUTLINE_SIZE;
  }

  update(opacity, position, rotation, zoom) {
    // reset all transformations
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalAlpha = opacity;

    if (rotation !== 0) {
      this.ctx.translate(
        this.center.x + position.x,
        this.center.y + position.y
      );
      this.ctx.rotate(rotation * 4 * TO_RADIANS);
      this.ctx.translate(
        -1 * (this.center.x + position.x),
        -1 * (this.center.y + position.y)
      );
    }

    // draw the image with the left corner point translated, too
    this.ctx.drawImage(
      this.data,
      0,
      0,
      this.data.width,
      this.data.height,
      this.center.x + position.x - (this.data.width / 2) * zoom,
      this.center.y + position.y - (this.data.height / 2) * zoom,
      this.data.width * zoom,
      this.data.height * zoom
    );

    // updating the outline
    const ctx = this.outline.getContext("2d");
    ctx.clearRect(0, 0, LayerImage.OUTLINE_SIZE, LayerImage.OUTLINE_SIZE);
    ctx.drawImage(
      this.canvas,
      0,
      0,
      LayerImage.OUTLINE_SIZE,
      LayerImage.OUTLINE_SIZE
    );
  }
}

export default LayerImage;
