import Dimension from "./Dimension.js";
import Point from "./Point.js";
import Mask from "./Mask.js";
import Color from "./Color.js";
import MaskEditor from "./MaskEditor.js";

import cloneCanvas from "./utils/cloneCanvas.js";
import combineObjects from "./utils/combineObjects.js";

class Layer {
  static TYPE_LOCAL_IMAGE = "LOCAL_IMAGE";
  static TYPE_REMOTE_IMAGE = "REMOTE_IMAGE";
  static TYPE_SERVER_IMAGE = "SERVER_IMAGE";
  static TYPE_TINT = "TINT";
  static TYPE_UNKNOWN = "UNKNOWN";

  static FIT_CONTAIN = "CONTAIN";
  static FIT_COVER = "COVER";

  static GRAVITY_NORTH = "N";
  static GRAVITY_NORTHEAST = "NE";
  static GRAVITY_EAST = "E";
  static GRAVITY_SOUTHEAST = "SE";
  static GRAVITY_SOUTH = "S";
  static GRAVITY_SOUTHWEST = "SW";
  static GRAVITY_WEST = "W";
  static GRAVITY_NORTHWEST = "NW";
  static GRAVITY_CENTER = "C";

  static DEFAULT_OPTIONS = {
    fit: Layer.FIT_CONTAIN,
    gravity: Layer.GRAVITY_CENTER,
    type: Layer.TYPE_UNKNOWN,
  };

  constructor(editor, canvas, dimensions, options = {}) {
    this.id = (() => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    })();
    this.editor = editor;

    this.name = options.name || "Unknown";

    this.options = combineObjects(Layer.DEFAULT_OPTIONS, options);
    this.type = this.options.type || Layer.TYPE_UNKNOWN;

    this.cache = {
      canvas: cloneCanvas(canvas),
      mask: new Mask(cloneCanvas(canvas)),
    };
    this.dimensions = dimensions;

    this.borderColor = this.getBorderColor(this.cache.canvas, dimensions);

    // the center is used for the rotation
    this.center = new Point(canvas.width / 2, canvas.height / 2);

    // not sure if this is needed
    //this.viewPort = new ViewPort(this.center, this.dimensions);

    // the current canvas
    this.canvas = canvas;
    this.mask = cloneCanvas(this.cache.mask);

    const DEFAULT = this.getDefaultTransformation();
    this.position = DEFAULT.position;
    this.zoomFactor = DEFAULT.zoomFactor;
    this.rotation = DEFAULT.rotation;
    this.flip = 1;

    // foreign mask
    this.foreignMaskId = null;
    this.foreignMask = null;

    this.debug = options.debug;
    // mouse position for debugging purposes
    this.mousePosition = new Point(0, 0);

    this.draw();
  }

  async clone() {
    const layer = new Layer(
      this.editor,
      this.cache.canvas,
      this.dimensions,
      this.options
    );
    layer.cache.canvas = cloneCanvas(this.cache.canvas);
    layer.cache.mask = cloneCanvas(this.cache.mask);
    layer.canvas = cloneCanvas(this.canvas);
    layer.mask = cloneCanvas(this.mask);
    layer.position = new Point(this.position.x, this.position.y);
    layer.zoomFactor = this.zoomFactor;
    layer.rotation = this.rotation;
    layer.flip = this.flip;
    layer.foreignMaskId = this.foreignMaskId;
    return layer;
  }

  getDefaultTransformation() {
    const DEFAULT = {
      rotation: 0,
      zoomFactor: 0,
      position: new Point(0, 0),
    };

    // calculate zoomFactor and/or position depending on the options
    switch (this.options.fit) {
      case Layer.FIT_CONTAIN:
        DEFAULT.zoomFactor =
          this.canvas.width /
          Math.max(this.dimensions.width, this.dimensions.height);
        break;
      case Layer.FIT_COVER:
        DEFAULT.zoomFactor =
          this.canvas.width /
          Math.min(this.dimensions.width, this.dimensions.height);

        // adjust position, too
        DEFAULT.position.x =
          -Math.round(
            this.canvas.width - this.dimensions.width * DEFAULT.zoomFactor
          ) / 2;
        DEFAULT.position.y =
          -Math.round(
            this.canvas.height - this.dimensions.height * DEFAULT.zoomFactor
          ) / 2;

        break;
    }
    return DEFAULT;
  }

  /**
   * Mirrors the cached content by flipping it's pixels
   */
  mirror() {
    this.flip = -1 * this.flip;
    return this.draw();
  }

  reset() {
    const DEFAULT = this.getDefaultTransformation();
    this.position = DEFAULT.position;
    this.zoomFactor = DEFAULT.zoomFactor;
    this.rotation = DEFAULT.rotation;
    return this.draw();
  }

  isTransformed() {
    const DEFAULT = this.getDefaultTransformation();
    if (
      this.rotation === DEFAULT.rotation &&
      this.position.equals(DEFAULT.position) &&
      this.zoomFactor === DEFAULT.zoomFactor
    ) {
      return false;
    } else {
      return true;
    }
  }

  setEditor(editor) {
    this.editor = editor;
  }

  setForeignMask(layerId) {
    this.foreignMaskId = layerId;
    return this.draw();
  }

  removeForeignMask() {
    this.foreignMaskId = null;
    return this.draw();
  }

  async editMask() {
    // return new Promise((resolve, reject) => {
    // create a UI for editing the mask. It's pretty simple

    const showMaskEditor = () => {
      return new Promise((resolve, reject) => {
        const $modal = $(MaskEditor.html);
        const maskEditor = new MaskEditor(this.cache, $modal[0]);
        $("body").append($modal);
        maskEditor.activateListeners();

        $modal.find("button").on("click", (e) => {
          e.preventDefault();
          const data = $(e.target).data();
          if (data.action) {
            $modal.remove();

            if (data.action === "ok" && maskEditor.isMaskChanged) {
              this.cache.mask = maskEditor.mask;
            }

            resolve({
              isChanged: data.action === "ok" && maskEditor.isMaskedChanged,
              mask: maskEditor.mask,
            });
          }
        });

        // listening on keyboard events on window, too. Cleaning up after the modal is destroyed
        const onKeyUp = (event) => {
          let action = null;
          if (event.keyCode === 13) action = "ok";
          if (event.keyCode === 27) action = "cancel";

          if (action) {
            $modal.remove();

            if (action === "ok" && maskEditor.isMaskChanged) {
              this.cache.mask = maskEditor.mask;
            }

            window.removeEventListener("keyup", onKeyUp);

            resolve({
              isChanged: action === "ok" && maskEditor.isMaskedChanged,
              mask: maskEditor.mask,
            });
          }
        };

        // react on keyboard events, too
        window.addEventListener("keyup", onKeyUp);

        // $modal.on("click", (event) => {
        //   // close the mask editor on a click outside of the canvas
        //   if ($(event.target).attr("id") === "maskeditor") {
        //     // resolve({
        //     //   isChanged: maskEditor.isMaskedChanged,
        //     //   mask: maskEditor.mask,
        //     // });
        //     $modal.remove();

        //     if (maskEditor.isMaskChanged) {
        //       this.cache.mask = maskEditor.mask;
        //     }

        //     resolve({
        //       isChanged: maskEditor.isMaskedChanged,
        //       mask: maskEditor.mask,
        //     });
        //   }
        // });

        maskEditor.draw();
      });
    };

    await showMaskEditor();
    return this.draw();

    //});

    /**
     * SENDING THE RESULT BACK TO THE FVTT SERVER
     * /
    const data = this.canvas.toDataURL("image/png");
    fetch(this.canvas.toDataURL("image/png"))
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "dot.png", blob);
        console.log(file);
      });
     / **
     * ^^^^ END SENDING
     */
  }

  setMaskCanvas(canvas) {
    this.cache.mask = canvas;
  }

  getBorderColor(canvas, dimensions) {
    const STRIPE_WIDTH = 10;
    const getColor = (imageData, x, y) => {
      const index = x + y * imageData.width;
      return new Color(
        imageData.data[index * 4],
        imageData.data[index * 4 + 1],
        imageData.data[index * 4 + 2],
        imageData.data[index * 4 + 3]
      );
    };

    const imageData = canvas
      .getContext("2d")
      .getImageData(
        (canvas.width - dimensions.width) / 2,
        (canvas.height - dimensions.height) / 2,
        dimensions.width,
        dimensions.height
      );

    let colors = [];

    // Horizontal scan
    for (let x = 0; x < imageData.width; x++) {
      for (let y = 0; y < STRIPE_WIDTH; y++) {
        colors.push(getColor(imageData, x, 0 + y));
        colors.push(getColor(imageData, x, imageData.height - y));
      }
    }
    // Vertical scan
    for (let y = STRIPE_WIDTH; y < imageData.height - STRIPE_WIDTH; y++) {
      for (let x = 0; x < STRIPE_WIDTH; x++) {
        colors.push(getColor(imageData, 0 + x, y));
        colors.push(getColor(imageData, imageData.width - x, y));
      }
    }
    colors = colors.filter((color) => color.alpha === 255);

    const sum = colors.reduce(
      (result, color) => {
        result.r += color.r;
        result.g += color.g;
        result.b += color.b;
        return result;
      },
      { r: 0, g: 0, b: 0 }
    );

    if (colors.length > 0) {
      return new Color(
        Math.round(sum.r / colors.length),
        Math.round(sum.g / colors.length),
        Math.round(sum.b / colors.length),
        255
      );
    } else {
      return new Color(0, 0, 0, 255);
    }
  }

  rotate(CHANGE) {
    if (CHANGE !== 0) {
      this.rotation += CHANGE;
    }
    return this.draw();
  }

  zoom(CHANGE) {
    if (CHANGE !== 0) {
      this.zoomFactor -= 0.01 * CHANGE;
    }
    return this.draw();
  }

  setMousePositionPercentage(position) {
    this.mousePosition = new Point(
      (position.x * this.canvas.width) / 100,
      (position.y * this.canvas.height) / 100
    );
  }

  translate(delta) {
    if (delta.x !== 0 || delta.y !== 0) {
      this.position.x += delta.x;
      this.position.y += delta.y;
    }
    return this.draw();
  }

  translatePercentage(delta) {
    delta = new Point(
      (delta.x * this.canvas.width) / 100,
      (delta.y * this.canvas.height) / 100
    );
    return this.translate(delta);
  }

  draw() {
    return new Promise((resolve, reject) => {
      requestAnimationFrame(() => {
        const updates = [];

        // get the foreign mask, if any
        if (this.foreignMaskId !== null) {
          const maskLayerIndex = this.editor.findLayerIndex(this.foreignMaskId);
          if (maskLayerIndex !== -1) {
            this.foreignMask = this.editor.layers[maskLayerIndex].content.mask;
            updates.push(this._update("canvas", this.foreignMask));
          } else {
            updates.push(this._update("canvas"));
          }
        } else {
          updates.push(this._update("canvas"));
        }
        updates.push(this._update("mask"));

        // when both updates are processed we resolve the draw result back to the caller
        return Promise.all(updates)
          .then((results) => resolve(this))
          .catch((error) => reject(error));
      });
    });
  }

  createThumbnail(target = "canvas", size = 32) {
    if (target !== "canvas" && target !== "mask") target = "canvas";
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas
      .getContext("2d")
      .drawImage(
        this[target],
        0,
        0,
        this[target].width,
        this[target].height,
        0,
        0,
        size,
        size
      );
    return canvas;
  }

  _update(target, mask = null) {
    return new Promise((resolve, reject) => {
      const clone = cloneCanvas(this.cache[target]);

      // create a clone for the rotation
      let context = clone.getContext("2d");
      context.resetTransform();

      context.clearRect(
        0,
        0,
        this.cache[target].width,
        this.cache[target].height
      );

      context.translate(this.center.x, this.center.y);
      context.scale(this.flip * 1, 1);
      context.rotate((this.rotation * Math.PI) / 180);
      context.translate(-this.center.x, -this.center.y);

      context.drawImage(this.cache[target], 0, 0);

      context.resetTransform();

      // draw on the actual canvas
      context = this[target].getContext("2d");
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, this[target].width, this[target].height);
      context.resetTransform();

      // if there is a foreignMask, apply it now
      if (mask !== null) {
        context.drawImage(
          mask,
          0,
          0,
          mask.width,
          mask.height,
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );
        context.globalCompositeOperation = "source-in";
      }

      context.translate(this.center.x, this.center.y);
      context.scale(this.zoomFactor, this.zoomFactor);
      context.translate(-this.center.x, -this.center.y);

      context.translate(this.position.x, this.position.y);

      context.drawImage(clone, 0, 0);

      context.resetTransform();

      if (this.debug) {
        // drawing the scaled mouse position
        context.fillStyle = "black";
        const cursorWidth = this.canvas.width / 100;
        context.fillRect(
          this.mousePosition.x - cursorWidth,
          this.mousePosition.y - cursorWidth,
          2 * cursorWidth,
          2 * cursorWidth
        );
        context.fill();
      }
      resolve(true);
    });
  }

  /**
   * Creates a Layer from a given Image object
   */
  // static async fromImg(editor, img, options = {}) {
  static fromImg(editor, url, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const img = await window.vtta.image.download(url);
        const canvas = document.createElement("canvas");
        // the size is the diagonal of the image estate
        canvas.width = canvas.height = Math.sqrt(
          Math.pow(img.naturalWidth, 2) + Math.pow(img.naturalHeight, 2)
        );
        canvas.style.width = canvas.width + "px";
        canvas.style.height = canvas.height + "px";

        const position = {
          x: (canvas.width - img.naturalWidth) / 2,
          y: (canvas.height - img.naturalHeight) / 2,
        };

        canvas
          .getContext("2d")
          .drawImage(
            img,
            position.x,
            position.y,
            img.naturalWidth,
            img.naturalHeight
          );

        resolve(
          new Layer(
            editor,
            canvas,
            new Dimension(img.naturalWidth, img.naturalHeight),
            options
          )
        );
      } catch (error) {
        window.vtta.ui.Notification.show(
          `<h2>Image load failed</h2><p>The image from <a href="${url}">this URL</a> could not be loaded onto the canvas.</p>
            <p>This is probably because it is located on a different server than your Foundry server/ your S3 storage. Upload it to a location you own and try again.</p>`,
          null
        );
        reject(error);
      }
    });
  }

  static async fromLoadedImg(editor, img, options = {}) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      // the size is the diagonal of the image estabe
      canvas.width = canvas.height = Math.sqrt(
        Math.pow(img.naturalWidth, 2) + Math.pow(img.naturalHeight, 2)
      );
      canvas.style.width = canvas.width + "px";
      canvas.style.height = canvas.height + "px";

      const position = {
        x: (canvas.width - img.naturalWidth) / 2,
        y: (canvas.height - img.naturalHeight) / 2,
      };

      canvas
        .getContext("2d")
        .drawImage(
          img,
          position.x,
          position.y,
          img.naturalWidth,
          img.naturalHeight
        );
      resolve(
        new Layer(
          editor,
          canvas,
          new Dimension(img.naturalWidth, img.naturalHeight),
          options
        )
      );
    });
  }

  getData() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      rotation: this.rotation,
      position: this.position,
      zoom: this.zoomFactor,
      color: this.borderColor.toString(),
      thumbnails: {
        canvas: this.createThumbnail("canvas", 32),
        mask: this.createThumbnail("mask", 32),
      },
      isChanged: this.isTransformed(),
      foreignMaskId: this.foreignMaskId,
      foreignMaskLabel: this.editor.calculateLayerIdentifier(
        this.foreignMaskId
      ),
    };
  }
}

export default Layer;
