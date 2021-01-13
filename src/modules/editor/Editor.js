import Point from "./Point.js";
import Layer from "./Layer.js";
import Tint from "./Tint.js";
import combineObjects from "./utils/combineObjects.js";
import logger from "../../util/logger.js";

class Editor {
  static BLEND_MODE_DEFAULT = "source-over";
  static BLEND_MODE_SOURCE_OVER = "source-over";
  static BLEND_MODE_SOURCE_IN = "source-in";
  static BLEND_MODE_SOURCE_OUT = "source-out";
  static BLEND_MODE_SOURCE_ATOP = "source-atop";
  static BLEND_MODE_DESTINATION_OVER = "destination-over";
  static BLEND_MODE_DESTINATION_IN = "destination-in";
  static BLEND_MODE_DESTINATION_OUT = "destination-out";
  static BLEND_MODE_DESTINATION_ATOP = "destination-atop";
  static BLEND_MODE_LIGHTER = "lighter";
  static BLEND_MODE_COPY = "copy";
  static BLEND_MODE_XOR = "xor";
  static BLEND_MODE_MULTIPLY = "multiply";
  static BLEND_MODE_SCREEN = "screen";
  static BLEND_MODE_OVERLAY = "overlay";
  static BLEND_MODE_DARKEN = "darken";
  static BLEND_MODE_LIGHTEN = "lighten";
  static BLEND_MODE_COLOR_DODGE = "color-dodge";
  static BLEND_MODE_COLOR_BURN = "color-burn";
  static BLEND_MODE_HARD_LIGHT = "hard-light";
  static BLEND_MODE_SOFT_LIGHT = "soft-light";
  static BLEND_MODE_DIFFERENCE = "difference";
  static BLEND_MODE_EXCLUSION = "exclusion";
  static BLEND_MODE_HUE = "hue";
  static BLEND_MODE_SATURATION = "saturation";
  static BLEND_MODE_COLOR = "color";
  static BLEND_MODE_LUMINOSITY = "luminosity";

  static BLEND_MODES = [
    Editor.BLEND_MODE_SOURCE_OVER,
    Editor.BLEND_MODE_SOURCE_IN,
    Editor.BLEND_MODE_SOURCE_OUT,
    Editor.BLEND_MODE_SOURCE_ATOP,
    Editor.BLEND_MODE_DESTINATION_OVER,
    Editor.BLEND_MODE_DESTINATION_IN,
    Editor.BLEND_MODE_DESTINATION_OUT,
    Editor.BLEND_MODE_DESTINATION_ATOP,
    Editor.BLEND_MODE_LIGHTER,
    Editor.BLEND_MODE_COPY,
    Editor.BLEND_MODE_XOR,
    Editor.BLEND_MODE_MULTIPLY,
    Editor.BLEND_MODE_SCREEN,
    Editor.BLEND_MODE_OVERLAY,
    Editor.BLEND_MODE_DARKEN,
    Editor.BLEND_MODE_LIGHTEN,
    Editor.BLEND_MODE_COLOR_DODGE,
    Editor.BLEND_MODE_COLOR_BURN,
    Editor.BLEND_MODE_HARD_LIGHT,
    Editor.BLEND_MODE_SOFT_LIGHT,
    Editor.BLEND_MODE_DIFFERENCE,
    Editor.BLEND_MODE_EXCLUSION,
    Editor.BLEND_MODE_HUE,
    Editor.BLEND_MODE_SATURATION,
    Editor.BLEND_MODE_COLOR,
    Editor.BLEND_MODE_LUMINOSITY,
  ];

  static DIRECTION_UP = "up";
  static DIRECTION_DOWN = "down";

  static DEFAULT_LAYER_OPTIONS = {
    alpha: 1.0,
    blendmode: Editor.BLEND_MODE_SOURCE_OVER,
    isLocked: false,
    isVisible: true,
  };

  constructor(size = 480) {
    this.size = size;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = this.size;

    this.layers = [];

    this.mousePosition = new Point(0, 0);
    this.isDragging = false;
    this.isRotating = false;
    this.isScaling = false;

    this.isChanged = false;

    this.eventTarget = document.createTextNode(null);

    this.draw();
    this.activateListeners();
  }

  getBlob() {
    return new Promise((resolve, reject) => {
      try {
        this.canvas.toBlob((blob) => {
          resolve(blob);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  addEventListener(...args) {
    return this.eventTarget.addEventListener(...args);
  }

  removeEventListener(...args) {
    return this.eventTarget.removeEventListener(...args);
  }

  dispatchEvent(...args) {
    return this.eventTarget.dispatchEvent(...args);
  }

  isUpdated() {
    this.dispatchEvent(new CustomEvent("update", { detail: this.getData() }));
  }

  forceRedraw() {
    this.isChanged = true;
  }

  processUpdates(updates) {
    return new Promise((resolve, reject) => {
      Promise.all(updates)
        .then((layers) => {
          const updates = layers
            .map((layer) => layer.id)
            .map((id) =>
              this.layers.filter((l) => l.content.foreignMaskId === id)
            )
            .reduce((all, current) => all.concat(current), [])
            .map((l) => l.content.draw());

          this.draw();
          //
          this.isUpdated();

          resolve(Promise.all(updates));
        })
        .catch((error) => reject(error));
    });
  }

  activateListeners() {
    /**
     * Interacting with the editor
     * Because of different content dimensions, we transfer the mouse position as a
     * percentage to the layers themselves
     */
    const mouseMove = (position) => {
      return new Promise((resolve, reject) => {
        const delta = this.mousePosition.delta(position);
        const deltaPercentage = {
          x: (delta.x * 100) / this.canvas.width,
          y: (delta.y * 100) / this.canvas.height,
        };
        this.mousePosition = position;

        if (!this.isDragging) return;

        const mousePositionPercentage = {
          x: (this.mousePosition.x * 100) / this.canvas.width,
          y: (this.mousePosition.y * 100) / this.canvas.height,
        };

        const changedLayers = this.layers.filter(
          (layer) => !layer.options.isLocked
        );

        const updates = changedLayers.map((layer) => {
          return layer.content.translatePercentage(deltaPercentage);
        });
        return this.processUpdates(updates);
      });
    };

    const mouseDown = (shiftKey = false) => {
      this.isDragging = true;
    };

    const mouseUp = () => {
      this.isDragging = false;
    };

    const mouseWheel = (shiftKey, CHANGE) => {
      return new Promise((resolve, reject) => {
        const changedLayers = this.layers.filter(
          (layer) => !layer.options.isLocked
        );
        const updates = changedLayers.map((layer) => {
          if (shiftKey) {
            return layer.content.rotate(CHANGE);
          } else {
            return layer.content.zoom(CHANGE);
          }
        });

        return this.processUpdates(updates);
      });
    };

    this.canvas.addEventListener("mousemove", (e) => {
      const getEventLocation = (element, event) => {
        const getElementPosition = (obj) => {
          var curleft = 0,
            curtop = 0;
          if (obj.offsetParent) {
            do {
              curleft += obj.offsetLeft;
              curtop += obj.offsetTop;
            } while ((obj = obj.offsetParent));
            return { x: curleft, y: curtop };
          }
          return undefined;
        };

        var pos = getElementPosition(element);

        return new Point(event.pageX - pos.x, event.pageY - pos.y);
      };

      mouseMove(getEventLocation(this.canvas, e));
    });
    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        mouseDown(e.shiftKey);
      }
    });
    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        mouseUp();
      }
    });

    let lastWheelEvent = null;
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        const mouseScrollThreshold = (ms) => {
          if (ms < 15) return 4;
          if (ms < 30) return 3;
          if (ms < 60) return 2;
          return 1;
        };

        let eventTimeDelta = 100;
        if (lastWheelEvent === null) {
          lastWheelEvent = new Date().getTime();
        } else {
          eventTimeDelta = new Date().getTime() - lastWheelEvent;
          lastWheelEvent = new Date().getTime();
        }

        const CHANGE =
          e.deltaY > 0
            ? mouseScrollThreshold(eventTimeDelta)
            : -1 * mouseScrollThreshold(eventTimeDelta);
        mouseWheel(e.shiftKey, CHANGE);
      },
      { passive: false }
    );
  }

  /**
   * ======================================================
   * ADDING LAYERS
   * ======================================================
   */
  static extractFilenameFromUrl = (url) => {
    if (url) {
      var m = url.toString().match(/.+\/([^\?]+)/);
      if (m && m.length > 1) {
        return m[1];
      }
    }
    return "Unknown";
  };

  async addImage(url, options = {}) {
    // const img = new Image();
    // switch (options.type) {
    //   case Layer.TYPE_REMOTE_IMAGE:
    //     img.crossOrigin = "Anonymous";
    //     img.src = `https://i.vtta.io/dl/${encodeURIComponent(url)}`;
    //     break;
    //   case Layer.TYPE_SERVER_IMAGE:
    //     if (url.match(/^http[s]?:\/\//)) {
    //       // if it's a S3 path, then we do not prepend the location origin to it
    //       const s3Endpoint =
    //         game.data.files.s3 &&
    //         game.data.files.s3 &&
    //         game.data.files.s3.endpoint &&
    //         game.data.files.s3.endpoint.href
    //           ? game.data.files.s3.endpoint.href
    //           : "";

    //       if (s3Endpoint !== "" && url.indexOf(s3Endpoint) === 0) {
    //         // it's an S3 image
    //         img.crossOrigin = "Anonymous";
    //         img.src = url;
    //       } else {
    //         // its a remote image
    //         options.type = Layer.TYPE_REMOTE_IMAGE;
    //         img.crossOrigin = "Anonymous";
    //         img.src = `https://i.vtta.io/dl/${encodeURIComponent(url)}`;
    //       }
    //     } else {
    //       img.src = `${window.location.origin}/${url}`;
    //     }
    //     break;
    // }
    try {
      const layer = await Layer.fromImg(this, url, options); // img, options);
      return this.addLayer(layer, options);
    } catch (error) {
      logger.error("An error occurred while adding the image", error);
      return null;
    }
  }

  async addRemoteImage(url, options = {}) {
    //const img = new Image();
    options = combineObjects(options, {
      type: Layer.TYPE_REMOTE_IMAGE,
      name: Editor.extractFilenameFromUrl(url),
    });

    return this.addImage(url, options);
    // img.crossOrigin = "Anonymous";
    // img.src = `https://i.vtta.io/dl/${encodeURIComponent(url)}`;
    // const layer = await Layer.fromImg(img, options);

    // return this.addLayer(layer, options);
  }

  async addServerImage(url, options = {}) {
    options = combineObjects(options, {
      type: Layer.TYPE_SERVER_IMAGE,
      name: Editor.extractFilenameFromUrl(url),
    });
    return this.addImage(url, options);
    // const layer = await Layer.fromImg(img, options);
    // img.src = url;

    // return this.addLayer(layer, options);
  }

  /**
   * @todo
   */
  async addLocalImage(file, options = {}) {
    options = combineObjects(options, {
      type: Layer.TYPE_LOCAL_IMAGE,
      name: file.name,
    });
    const layer = await Layer.fromLoadedImg(this, file.img, options);

    return this.addLayer(layer, options);
  }

  async addTint(color) {
    color = typeof color === "object" ? color.toString() : color;
    const options = {
      type: Layer.TYPE_TINT,
      name: color,
    };
    const layer = await Tint.fromColor(this, color, options);

    return this.addLayer(layer, options);
  }

  /**
   * ======================================================
   * ADDING A LAYER
   * ======================================================
   */
  addLayer(layer, options) {
    return new Promise((resolve, reject) => {
      options = combineObjects(Editor.DEFAULT_LAYER_OPTIONS, options);

      const data = {
        content: layer,
        options: options,
      };

      this.layers.unshift(data);
      this.draw()
        .then((_) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  /**
   * ======================================================
   * INTERACTING WITH LAYERS
   * ======================================================
   */
  // enable finding a layer by Layer and by Layer.id at the same time
  findLayerIndex(obj) {
    if (obj === null) {
      return -1;
    }

    if (typeof obj === "string") {
      return this.layers.findIndex((layer) => layer.content.id === obj);
    }

    if (obj.id !== undefined) {
      return this.layers.findIndex((layer) => layer.content.id === obj.id);
    }

    return -1;
  }

  calculateLayerIdentifier(layer) {
    let index = this.findLayerIndex(layer);
    const numbers = [
      "⓿",
      "❶",
      "❷",
      "❸",
      "❹",
      "❺",
      "❻",
      "❼",
      "❽",
      "❾",
      "❿",
      "⓫",
      "⓬",
      "⓭",
      "⓮",
      "⓯",
      "⓰",
      "⓱",
      "⓲",
      "⓳",
      "⓴",
    ];

    if (index === -1) return "Z";
    //index = this.layers.length - 1 - index;
    // index = numbers[this.layers.length - index];
    if (
      this.layers.length - index >= 0 ||
      this.layers.length - index <= numbers.length
    )
      return numbers[this.layers.length - index];
    else return numbers[numbers.length - 1];
    return String.fromCharCode(65 + index);
    // the first layer with index 0 is actually the bottom layer, so the last layer is 'A' and the first layer is 'A+n'
  }

  removeLayer(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    this.layers.splice(index, 1);
    return this.draw();
  }

  swapLayers(a, b) {
    const aIndex = this.findLayerIndex(a);
    const bIndex = this.findLayerIndex(b);
    if (aIndex === -1 || bIndex === -1) return this.draw();

    // pay attention to foreign masks!
    const temp = this.layers[aIndex];
    this.layers[aIndex] = this.layers[bIndex];
    this.layers[bIndex] = temp;
    return this.draw();
  }

  moveLayer(layer, DIRECTION, steps = 1) {
    console.log(`Direction: ${DIRECTION} for ${steps}`);
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    let swapIndex = null;
    if (DIRECTION === Editor.DIRECTION_UP) {
      // the top-most layer cannot move up
      swapIndex = index + steps;
      swapIndex =
        swapIndex >= this.layers.length ? this.layers.length - 1 : swapIndex;
    }

    if (DIRECTION === Editor.DIRECTION_DOWN) {
      // the bottom layer cannot move down
      swapIndex = index - steps;
      swapIndex = swapIndex < 0 ? 0 : swapIndex;
    }

    console.log(`Swapping ${index} with ${swapIndex}`);

    // if there is no change, we do not do anything
    if (index === swapIndex) return this.draw();

    const temp = this.layers[swapIndex];
    this.layers[swapIndex] = this.layers[index];
    this.layers[index] = temp;
    return this.draw();
    //return Promise.resolve(true);

    // const index = this.findLayerIndex(layer);
    // if (index === -1) return;

    // let swapIndex = null;
    // if (DIRECTION === Editor.DIRECTION_UP) {
    //   // the top-most layer cannot move up
    //   if (index === this.layers.length - 1) return;
    //   swapIndex = index + 1;
    // }

    // if (DIRECTION === Editor.DIRECTION_DOWN) {
    //   // the bottom layer cannot move down
    //   if (index === 0) return;
    //   swapIndex = index - 1;
    // }

    // if (swapIndex !== null) {
    //   const temp = this.layers[swapIndex];
    //   this.layers[swapIndex] = this.layers[index];
    //   this.layers[index] = temp;
    //   return this.draw();
    // }
    // return Promise.resolve(true);
  }

  /**
   * Visibility
   */
  hideLayer(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    this.layers[index].options.isVisible = false;
    return this.draw();
  }

  showLayer(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    this.layers[index].options.isVisible = false;
    return this.draw();
  }

  toggleLayerVisibility(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    this.layers[index].options.isVisible = !this.layers[index].options
      .isVisible;
    return this.draw();
    this.isChanged = true;
  }

  /**
   * Lock
   */
  // lockLayer(layer) {
  //   const index = this.findLayerIndex(layer);
  //   if (index === -1) return;

  //   this.layers[index].options.isLocked = false;
  //   this.isChanged = true;
  // }

  // unlockLayer(layer) {
  //   const index = this.findLayerIndex(layer);
  //   if (index === -1) return;

  //   this.layers[index].options.isLocked = false;
  //   this.isChanged = true;
  // }

  toggleLayerLock(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    if (this.layers[index].options.isLocked) {
      this.layers[index].options.isLocked = false;
    } else {
      this.layers[index].options.isLocked = true;
    }
    return this.draw();
  }

  /**
   * Alpha
   */
  setLayerAlpha(layer, alpha) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    this.layers[index].options.alpha = alpha;

    return this.draw();
  }

  /**
   * Color
   */

  setLayerColor(layer, color) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    this.layers[index].content.setColor(color);
    return this.draw();
  }

  async editLayerMask(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;
    this.processUpdates([this.layers[index].content.editMask()]);
  }

  /**
   * Blendmode
   */
  getBlendmodes() {
    return [
      Editor.BLEND_MODE_SOURCE_OVER,
      Editor.BLEND_MODE_SOURCE_IN,
      Editor.BLEND_MODE_SOURCE_OUT,
      Editor.BLEND_MODE_SOURCE_ATOP,
      Editor.BLEND_MODE_DESTINATION_OVER,
      Editor.BLEND_MODE_DESTINATION_IN,
      Editor.BLEND_MODE_DESTINATION_OUT,
      Editor.BLEND_MODE_DESTINATION_ATOP,
      Editor.BLEND_MODE_LIGHTER,
      Editor.BLEND_MODE_COPY,
      Editor.BLEND_MODE_XOR,
      Editor.BLEND_MODE_MULTIPLY,
      Editor.BLEND_MODE_SCREEN,
      Editor.BLEND_MODE_OVERLAY,
      Editor.BLEND_MODE_DARKEN,
      Editor.BLEND_MODE_LIGHTEN,
      Editor.BLEND_MODE_COLOR_DODGE,
      Editor.BLEND_MODE_COLOR_BURN,
      Editor.BLEND_MODE_HARD_LIGHT,
      Editor.BLEND_MODE_SOFT_LIGHT,
      Editor.BLEND_MODE_DIFFERENCE,
      Editor.BLEND_MODE_EXCLUSION,
      Editor.BLEND_MODE_HUE,
      Editor.BLEND_MODE_SATURATION,
      Editor.BLEND_MODE_COLOR,
      Editor.BLEND_MODE_LUMINOSITY,
    ];
  }

  setLayerBlendmode(layer, blendmode) {
    if (this.getBlendmodes().find((mode) => mode === blendmode)) {
      const index = this.findLayerIndex(layer);
      if (index === -1) return;
      this.layers[index].options.blendmode = blendmode;
    }
    return this.draw();
  }

  /**
   * Reset
   */
  async resetLayer(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;
    await this.layers[index].content.reset();
    return this.draw();
  }

  /**
   * Clone
   */

  async cloneLayer(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;
    const clonedLayer = await this.layers[index].content.clone();
    return this.addLayer(clonedLayer, this.layers[index].options);
  }

  /**
   * Delete
   */
  deleteLayer(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    // delete all references to the mask this layer provides first
    const layersAffected = this.layers.filter(
      (layer) => layer.content.foreignMaskId === this.layers[index].content.id
    );
    layersAffected.forEach((layer) => layer.content.removeForeignMask());

    this.layers.splice(index, 1);
    return this.draw();
  }

  /**
   * Delete
   */
  async mirrorLayer(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;
    await this.layers[index].content.mirror();
    return this.draw();
  }

  /**
   * ======================================================
   * WORKING WITH LAYERS
   * ======================================================
   */

  async cycleLayerForeignMask(layer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    let maskIndex = this.layers.length - 1;

    if (this.layers[index].content.foreignMaskId === null) {
      // no mask was set yet, so we start at layer with index 0
      await this.layers[index].content.setForeignMask(
        this.layers[maskIndex].content.id
        //this.layers[maskIndex].content.mask
      );
    } else {
      maskIndex = this.findLayerIndex(this.layers[index].content.foreignMaskId);
      // next mask;
      maskIndex--;
      if (maskIndex === -1) {
        await this.layers[index].content.removeForeignMask();
      } else {
        await this.layers[index].content.setForeignMask(
          this.layers[maskIndex].content.id
        );
      }
    }
    return this.draw();
  }

  // sets
  setForeignMask(layer, maskLayer) {
    const index = this.findLayerIndex(layer);
    if (index === -1) return;

    const maskIndex = this.findLayerIndex(maskLayer);
    if (maskIndex === -1) return;

    this.layers[index].content.setForeignMask(
      this.layers[maskIndex].content.id,
      this.layers[maskIndex].content.mask
    );
    this.isChanged = true;
  }

  removeForeignMask(layer) {
    layer.setForeignMask(null);
    this.isChanged = true;
  }

  /**
   * ======================================================
   * DRAWING THE RESULT
   * ======================================================
   */
  draw(force = false) {
    return new Promise((resolve, reject) => {
      requestAnimationFrame(() => {
        const context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.layers
          .filter((layer) => layer.options.isVisible)
          .forEach((layer) => {
            // set the blend mode
            context.globalCompositeOperation = layer.options.blendmode;
            // set the alpha of that layer
            context.globalAlpha = layer.options.alpha;

            // draw the image on top of the stack
            context.drawImage(
              layer.content.canvas,
              0,
              0,
              layer.content.canvas.width,
              layer.content.canvas.height,
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
          });
      });
      // // if nothing changed, we are sparing resources
      // if (this.isChanged || force === true) {
      //   // return to idle
      //   this.isChanged = false;
      // }
      resolve(this.getData());
    });
    //requestAnimationFrame(this.draw.bind(this));
  }

  getLayerOptions(layerId) {
    const layer = this.layers.find((l) => l.content.id === layerId);
    return layer ? layer.options : {};
  }

  /**
   * ======================================================
   * Provide Data to the UI
   * ======================================================
   */
  getData() {
    const data = {
      size: this.size,
      layers: this.layers.map((layer) => {
        const data = Object.assign(layer.content.getData(), layer.options);
        data.alpha = Math.round(data.alpha * 100);
        data.alphaPercent = data.alpha + "%";
        return data;
      }),
    };

    return data;
  }
}

export default Editor;
