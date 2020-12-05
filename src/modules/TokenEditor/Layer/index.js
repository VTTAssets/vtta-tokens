import LayerImage from "./LayerImage.js";

class Layer {
  constructor(layerSize) {
    this.img = null;
    this.mask = null;

    this.center = {
      x: layerSize / 2,
      y: layerSize / 2,
    };

    // scaling of the layer in relation to the target canvas
    this.zoom = 1;

    // rotating the layer
    this.degree = 0;

    // translation of the layer in relation to the target canvas
    this.position = {
      x: 0,
      y: 0,
    };

    // alpha
    this.opacity = 1.0;

    // blend mode
    this.blendMode = CONSTANTS.blendmodes.SOURCE_OVER;

    // visibility
    this.visible = true;

    // Layer is locked
    this.locked = true;

    this.color = null;

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
  }

  transformationsEnabled() {
    return this.type === CONSTANTS.types.TYPE_IMAGE;
  }

  activate() {
    this.active = true;
  }

  deactivate() {
    this.active = false;
  }

  applyLock() {
    this.locked = true;
  }

  removeLock() {
    this.locked = false;
  }

  applyMask() {
    this.masked = true;
  }

  removeMask() {
    this.masked = false;
  }

  applyVisibility() {
    this.visible = true;
  }

  removeVisibility() {
    this.visible = false;
  }

  setMaskProvider() {
    this.providesMask = true;
  }

  setColor(color) {
    this.color = color;
  }

  setImage(image, position = null) {
    this.image = new LayerImage(image);
    this.scaleToFit();

    this.mask = new LayerImage(image);

    // generate the mask data
    this.maskData = new Mask(image);
    //this.maskData = mask.canvas;

    this.updateLayer();
  }

  scaleToFit() {
    const width = this.img.naturalWidth
      ? this.img.naturalWidth
      : this.img.width;
    const height = this.img.naturalHeight
      ? this.img.naturalHeight
      : this.img.height;

    const ratioX = this.canvas.width / width;
    const ratioY = this.canvas.height / height;
    this.zoom = Math.min(ratioX, ratioY);
  }

  static fromUrl(layerSize, url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = (event) => {
        const layer = new Layer(layerSize);

        layer.type = CONSTANTS.types.TYPE_IMAGE;
        layer.title = url;

        layer.setImage(image);
        resolve(layer);
      };
      image.onerror = (event) => reject(event);
      image.src = url;
    });
  }

  static fromImage(layerSize, title, image) {
    return new Promise((resolve, reject) => {
      const layer = new Layer(layerSize);
      layer.type = CONSTANTS.types.TYPE_IMAGE;
      layer.title = title;

      layer.setImage(image);
      resolve(layer);
    });
  }

  static fromColor(layerSize, color) {
    return new Promise((resolve, reject) => {
      const layer = new Layer(layerSize);
      layer.title = color;
      layer.type = CONSTANTS.types.TYPE_COLOR;
      layer.data = document.createElement("canvas");
      layer.data.width = layerSize;
      layer.data.height = layerSize;

      // we simple reference to the data for the canvas, since it's basically the same
      layer.canvas = layer.data;

      const ctx = layer.data.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, layerSize, layerSize);

      layer.updateOutline();
      layer.setColor(color);

      resolve(layer);
    });
  }

  reset() {
    if (!this.transformationsEnabled()) return;
    // scaling of the layer in relation to the target canvas
    this.zoom = 1;

    // rotating the layer
    this.degree = 0;

    // translation of the layer in relation to the target canvas
    this.position = {
      x: 0,
      y: 0,
    };
    this.scaleToFit();
    this.updateLayer();
  }

  translate(x, y) {
    if (!this.transformationsEnabled()) return;
    console.log(
      `Translating from ${this.position.x}/${this.position.y} by ${x}/${y} to ${
        this.position.x + x
      }/${this.position.y + y}`
    );
    this.position.x -= x; //* this.zoom;
    this.position.y -= y; //* this.zoom;
    // this.ctx.translate(x, y);
    this.updateLayer();
  }

  rotate(degree) {
    if (!this.transformationsEnabled()) return;
    this.degree += degree;
    this.updateLayer();
    //  this.updateLayer();
  }

  scale(factor) {
    if (!this.transformationsEnabled()) return;
    this.zoom = this.zoom * factor;
    this.updateLayer();
  }

  remove() {
    this.canvas = null;
    this.data = null;
  }

  updateLayer() {
    // reset all transformations
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalAlpha = this.opacity;

    if (this.degree !== 0) {
      this.ctx.translate(
        this.center.x + this.position.x,
        this.center.y + this.position.y
      );
      this.ctx.rotate(this.degree * 4 * TO_RADIANS);
      this.ctx.translate(
        -1 * (this.center.x + this.position.x),
        -1 * (this.center.y + this.position.y)
      );
    }

    // draw the image with the left corner point translated, too
    this.ctx.drawImage(
      this.data,
      0,
      0,
      this.data.width,
      this.data.height,
      this.center.x + this.position.x - (this.data.width / 2) * this.zoom,
      this.center.y + this.position.y - (this.data.height / 2) * this.zoom,
      this.data.width * this.zoom,
      this.data.height * this.zoom
    );

    // updating the icon
    this.updateOutline();

    // update the mask
    this.updateMask();
  }

  updateMask() {
    // reset all transformations
    this.maskCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.maskCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.degree !== 0) {
      this.maskCtx.translate(
        this.center.x + this.position.x,
        this.center.y + this.position.y
      );
      this.maskCtx.rotate(this.degree * 4 * TO_RADIANS);
      this.maskCtx.translate(
        -1 * (this.center.x + this.position.x),
        -1 * (this.center.y + this.position.y)
      );
    }

    // draw the image with the left corner point translated, too
    this.maskCtx.drawImage(
      this.maskData,
      0,
      0,
      this.data.width,
      this.data.height,
      this.center.x + this.position.x - (this.data.width / 2) * this.zoom,
      this.center.y + this.position.y - (this.data.height / 2) * this.zoom,
      this.data.width * this.zoom,
      this.data.height * this.zoom
    );
  }

  getData() {
    switch (this.type) {
      case CONSTANTS.types.TYPE_DEFAULT:
      case CONSTANTS.types.TYPE_IMAGE:
        return {
          id: this.id,
          type: this.type,
          title: this.title,
          masked: this.masked,
          locked: this.locked,
          visible: this.visible,
          canMove: true,
          opacity: Math.round(this.opacity * 100),
        };
        break;
      case CONSTANTS.types.TYPE_COLOR:
        return {
          id: this.id,
          type: this.type,
          title: this.title,
          masked: this.masked,
          visible: this.visible,
          canMove: false,
          opacity: Math.round(this.opacity * 100),
        };
    }
  }
}

export default Layer;
