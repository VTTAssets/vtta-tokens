import config from "../../config/index.js";
import logger from "../../util/logger.js";
import Layer from "./Layer/Layer.js";
import CONSTANTS from "./constants.js";

class TokenEditor {
  constructor(tokenSize = 400) {
    this.tokenSize = tokenSize;

    this.layers = [];
    this.maskCanvas = null;

    this.setCanvas(document.createElement("canvas"));
  }

  setMaskLayer(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) {
      this.maskCanvas = layer.mask;
    }
  }

  setLayerOpacity(layerId, value) {
    value = parseInt(value) / 100;
    console.log("Setting Layer Opacity for " + layerId + " to " + value);
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) {
      layer.opacity = value;
    }
  }

  setLayerBlendMode(layerId, value) {
    console.log(
      "Setting Layer setLayerBlendmode for " + layerId + " to " + value
    );
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) {
      layer.blendMode = value;
    }
  }

  addLayer(layer) {
    this.layers.push(layer);
  }

  removeLayer(layerId) {
    this.layers = this.layers.filter((layer) => layer.id !== layerId);
  }

  getLayer(layerId) {
    return this.layers.find((layer) => layer.id === layerId);
  }

  resetLayer(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) layer.reset();
  }

  applyLock(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) layer.applyLock();
  }

  removeLock(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) layer.removeLock();
  }

  setMask(mask) {
    this.maskCanvas = mask;
  }

  getMask() {
    return this.maskCanvas;
  }

  applyMask(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) layer.applyMask();
  }

  removeMask(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) layer.removeMask();
  }

  applyVisibility(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) layer.applyVisibility();
  }

  removeVisibility(layerId) {
    const layer = this.layers.find((layer) => layer.id === layerId);
    if (layer) layer.removeVisibility();
  }

  getData() {
    const maskLayer = this.layers.find((layer) => layer.providesMask);

    return {
      layers: this.layers.map((layer, index) => {
        return Object.assign(layer.getData(), {
          canMoveDown: index < this.layers.length - 1,
          canMoveUp: index > 0,
        });
      }),
      mask: maskLayer ? maskLayer.mask : null,
    };
  }

  clear() {
    this.canvas
      .getContext("2d")
      .clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.canvas.height = this.tokenSize;
    this.canvas.width = this.tokenSize;
  }

  translate(x, y) {
    this.layers
      .filter((layer) => layer.locked === false)
      .forEach((layer) => layer.translate(x, y));
  }

  rotate(degree) {
    this.layers
      .filter((layer) => layer.locked === false)
      .forEach((layer) => layer.rotate(degree));
  }

  scale(factor) {
    this.layers
      .filter((layer) => layer.locked === false)
      .forEach((layer) => layer.scale(factor));
  }

  draw() {
    const context = this.canvas.getContext("2d");

    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // go through all the layers, apply the mask and deliver the result
    for (let i = this.layers.length - 1; i >= 0; i--) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      const layer = this.layers[i];

      if (layer.visible === false) continue;

      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = layer.canvas.width;
      sourceCanvas.height = layer.canvas.height;

      const sourceContext = sourceCanvas.getContext("2d");

      if (layer.masked) {
        sourceContext.drawImage(this.maskCanvas, 0, 0);

        sourceContext.globalCompositeOperation = CONSTANTS.blendmodes.SOURCE_IN;
      }
      sourceContext.drawImage(layer.canvas, 0, 0);

      context.globalCompositeOperation = layer.blendMode;
      context.globalAlpha = layer.opacity;
      context.drawImage(sourceCanvas, 0, 0);
    }
  }

  getImage() {}
}

export default TokenEditor;
