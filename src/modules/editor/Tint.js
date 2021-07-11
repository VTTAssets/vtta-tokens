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

  // /**
  //  * @override
  //  * Do not allow changes
  //  */
  // rotate(CHANGE) {
  //   return;
  // }

  // /**
  //  * @override
  //  * Do not allow changes
  //  */
  // zoom(CHANGE) {
  //   return;
  // }

  // /**
  //  * @override
  //  * Do not allow changes
  //  */
  // translate(delta) {
  //   return;
  // }

  // /**
  //  * @override
  //  * Fill the canvas with the current color, apply a full-size mask
  //  */
  // draw() {
  //   if (this.foreignMaskId !== null) {
  //     const maskLayerIndex = this.editor.findLayerIndex(this.foreignMaskId);
  //     if (maskLayerIndex !== -1) {
  //       console.log(
  //         "Updating layer " +
  //           this.name +

  //           " with foreign mask " +
  //           this.foreignMaskId
  //       );
  //       this.foreignMask = this.editor.layers[maskLayerIndex].content.mask;
  //       this._update(
  //         "canvas",
  //         this.foreignMask
  //         //this.editor.layers[maskLayerIndex].content.mask
  //       );
  //     } else {
  //       console.log(
  //         "Updating layer " +
  //           this.name +
  //           "without foreign mask, since I haven't found the foreign mask layer with id " +
  //           this.foreignMaskId
  //       );
  //       this._update("canvas");
  //     }
  //   } else {
  //     console.log("Updating layer " + this.name + " without foreign mask");
  //     this._update("canvas");
  //   }
  // }

  // _update(target, mask = null) {
  //   // draw on the actual canvas
  //   const context = this[target].getContext("2d");
  //   context.globalCompositeOperation = "source-over";
  //   context.clearRect(0, 0, this[target].width, this[target].height);
  //   context.resetTransform();

  //   /* FOREIGN MASK DRAWING WAS HERE */
  //   // if there is a foreignMask, apply it now
  //   if (mask !== null) {
  //     context.drawImage(
  //       mask,
  //       0,
  //       0,
  //       mask.width,
  //       mask.height,
  //       0,
  //       0,
  //       this.canvas.width,
  //       this.canvas.height
  //     );
  //     context.globalCompositeOperation = "source-in";
  //     // resolve(true);
  //   }

  //   if (target === "canvas") {
  //     // fill the canvas with the given color
  //     context.fillStyle = this.color;
  //     this[target]
  //       .getContext("2d")
  //       .rect(0, 0, this.canvas.width, this.canvas.height);
  //     this[target].getContext("2d").fill();
  //   } else {
  //     // mask the whole layer
  //     this[target].getContext("2d").fillStyle = "#000000";
  //     this[target]
  //       .getContext("2d")
  //       .rect(0, 0, this.mask.width, this.mask.height);
  //     this[target].getContext("2d").fill();
  //   }
  // }
}

export default Tint;
