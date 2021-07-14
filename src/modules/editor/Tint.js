import Layer from "./Layer.js";
import Dimension from "./Dimension.js";

class Tint extends Layer {
  constructor(editor, canvas, dimensions, options = {}, color = "#FF0000") {
    options.type = Layer.TYPE_TINT;

    super(editor, canvas, dimensions, options);

    this.setColor(color);
  }

  getData() {
    return Object.assign(super.getData(), {
      color: this.color,
    });
  }

  setColor(color) {
    return new Promise((resolve, reject) => {
      this.color = color;
      const context = this.cache.canvas.getContext("2d");
      context.fillStyle = color;
      context.rect(0, 0, this.cache.canvas.width, this.cache.canvas.height);
      context.fill();
      return this.draw();
    });
  }

  /**
   * Creates a Tint from a given color
   */
  static fromColor(editor, color, options = {}) {
    return new Promise((resolve, reject) => {
      const DEFAULT_SIZE = 480;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = DEFAULT_SIZE;
      const context = canvas.getContext("2d");
      context.fillStyle = color;
      context.rect(0, 0, canvas.width, canvas.height);
      context.fill();

      const layer = new Tint(
        editor,
        canvas,
        new Dimension(DEFAULT_SIZE, DEFAULT_SIZE),
        options,
        color
      );
      resolve(layer);
    });
  }
}

export default Tint;
