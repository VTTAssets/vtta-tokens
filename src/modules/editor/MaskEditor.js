class MaskEditor {
  static cloneCanvas(canvas) {
    //create a new canvas
    var clone = document.createElement("canvas");
    var context = clone.getContext("2d");

    //set dimensions
    clone.width = canvas.width;
    clone.height = canvas.height;

    //apply the old canvas to the new one
    context.drawImage(canvas, 0, 0);

    //return the new canvas
    return clone;
  }

  /**
   * Gets the view canvas position on the current page, which is necessary to allow a fluid mousewheel zoom
   * @param {HTMLElement} element
   * @param {Event} event
   */
  static getEventLocation = (element, event) => {
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

    return {
      x: event.pageX - pos.x,
      y: event.pageY - pos.y,
    };
  };

  static html = `
    <div class="maskeditor">
      <div class="vtta description ">
        <section class="window-content">
          <h1>Mask Editor</h1>
          <p>Use your mouse to paint the mask. Paint using your left mousebutton to add to the mask and hold shift to remove from the mask. </p>
          <div class="buttons"><button data-action="ok" class="vtta ui button" title="[Enter] Close and apply the changes"><i class="fas fa-check"></i> Apply</button><button data-action="cancel"  class="vtta ui button" title="[ESC] Close and do not apply the changes"><i class="fas fa-times"></i> Cancel</button></div>
        </section>
      </div>
    </div>`;

  static drawCheckeredBackground(canvas, color = "black", width = 10) {
    var ctx = canvas.getContext("2d");
    const prevFillStyle = ctx.fillStyle;
    const prevAlpha = ctx.globalAlpha;

    ctx.fillStyle = color;

    const numCols = Math.ceil(canvas.width / width);
    const numRows = Math.ceil(canvas.height / width);

    for (let i = 0; i < numRows; ++i) {
      for (let j = 0, col = numCols / 2; j < col; ++j) {
        ctx.rect(2 * j * width + (i % 2 ? 0 : width), i * width, width, width);
      }
    }

    ctx.fill();

    ctx.fillStyle = prevFillStyle;
    ctx.globalAlpha = prevAlpha;
  }

  constructor(layer, container) {
    this.layer = layer;

    // margin to the screen is MARGIN%
    const MARGIN = 10;
    const WIDTH = $(container).width();

    this.canvas = document.createElement("canvas");

    this.canvas.width = layer.canvas.width;
    this.canvas.height = layer.canvas.height;
    this.canvas.getContext("2d").drawImage(layer.canvas, 0, 0);

    this.brushSize = 20;

    // We will be drawing on this mask clone in order to be able to discord the changes made
    this.isMaskChanged = false;
    this.mask = MaskEditor.cloneCanvas(this.layer.mask);
    this.ctx = this.mask.getContext("2d");
    this.ctx.lineJoin = this.ctx.lineCap = "round";

    // grayscale the original
    const pixels = layer.canvas
      .getContext("2d")
      .getImageData(0, 0, this.canvas.width, this.canvas.height);
    const targetPixels = this.canvas
      .getContext("2d")
      .createImageData(this.canvas.width, this.canvas.height);

    let luma;
    for (let i = 0; i < pixels.data.length; i += 4) {
      luma =
        pixels.data[i] * 0.2126 +
        pixels.data[i + 1] * 0.7152 +
        pixels.data[i + 2] * 0.0722;

      targetPixels.data[i] = targetPixels.data[i + 1] = targetPixels.data[
        i + 2
      ] = luma;
      targetPixels.data[i + 3] = pixels.data[i + 3];
    }
    this.greyscale = document.createElement("canvas");
    this.greyscale.width = layer.canvas.width;
    this.greyscale.height = layer.canvas.height;
    this.greyscale.getContext("2d").putImageData(targetPixels, 0, 0);

    this.currentPoint = {
      x: 0,
      y: 0,
    };

    container.append(this.canvas);
  }

  activateListeners() {
    var rect = this.canvas.getBoundingClientRect();
    this.ratio = rect.width / this.canvas.width;

    let isDrawing = false,
      lastPoint = null;

    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        if (event.wheelDelta < 0) {
          this.brushSize--;
          if (this.brushSize <= 2) this.brushSize = 2;
        } else {
          this.brushSize++;
          if (this.brushSize >= 40) this.brushSize = 40;
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener("mouseup", (event) => {
      isDrawing = false;
    });
    this.canvas.addEventListener("mousedown", (event) => {
      event.preventDefault();
      isDrawing = event.button === 0;
      if (isDrawing) {
        lastPoint = MaskEditor.getEventLocation(this.canvas, event);
        this.ctx.globalCompositeOperation = event.shiftKey
          ? "destination-out"
          : "destination-over";

        this.ctx.fillStyle = "black";
        this.ctx.beginPath();

        this.ctx.arc(
          lastPoint.x / this.ratio,
          lastPoint.y / this.ratio,
          this.brushSize / this.ratio,
          0,
          2 * Math.PI
        );
        this.ctx.fill();

        this.isMaskChanged = true;
      }
    });
    this.canvas.addEventListener("mousemove", (event) => {
      this.currentPoint = MaskEditor.getEventLocation(this.canvas, event);
      // console.log(this.currentPoint);
      if (!isDrawing) return;

      const distanceBetween = (point1, point2) => {
        return Math.sqrt(
          Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
      };
      const angleBetween = (point1, point2) => {
        return Math.atan2(point2.x - point1.x, point2.y - point1.y);
      };

      const distance = distanceBetween(lastPoint, this.currentPoint);
      const angle = angleBetween(lastPoint, this.currentPoint);

      const RESOLUTION = 2;
      for (var i = 0; i < distance; i += RESOLUTION) {
        const x = lastPoint.x + Math.sin(angle) * i;
        const y = lastPoint.y + Math.cos(angle) * i;

        // create a "delete" operation when holding shift, otherwise
        // add to the mask
        this.ctx.globalCompositeOperation = event.shiftKey
          ? "destination-out"
          : "destination-over";

        this.ctx.fillStyle = "black";
        this.ctx.beginPath();

        this.ctx.arc(
          x / this.ratio,
          y / this.ratio,
          this.brushSize / this.ratio,
          0,
          2 * Math.PI
        );
        this.ctx.fill();

        this.isMaskChanged = true;
        lastPoint = this.currentPoint;
      }
    });
  }

  draw() {
    const ALPHA_COLOR = "rgb(113, 113, 255)";
    // draw the grayscale version first, with a 0.5 opacity
    const context = this.canvas.getContext("2d");
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.globalAlpha = 0.25;
    context.drawImage(this.greyscale, 0, 0);

    context.globalAlpha = 1;

    // checkered source image
    const checkeredSource = document.createElement("canvas");
    checkeredSource.width = this.layer.canvas.width;
    checkeredSource.height = this.layer.canvas.height;
    MaskEditor.drawCheckeredBackground(checkeredSource, ALPHA_COLOR, 20);
    const checkeredSourceContext = checkeredSource.getContext("2d");
    checkeredSourceContext.drawImage(this.layer.canvas, 0, 0);

    // draw the masked image on an intermediate canvas
    const intermediate = document.createElement("canvas");
    intermediate.width = this.layer.canvas.width;
    intermediate.height = this.layer.canvas.height;
    const intermediateContext = intermediate.getContext("2d");
    intermediateContext.drawImage(this.mask, 0, 0);
    intermediateContext.globalCompositeOperation = "source-in";
    //intermediateContext.drawImage(this.layer.canvas, 0, 0);
    intermediateContext.drawImage(checkeredSource, 0, 0);
    context.drawImage(intermediate, 0, 0);

    context.fillStyle = "black";
    context.beginPath();
    context.arc(
      this.currentPoint.x / this.ratio,
      this.currentPoint.y / this.ratio,
      this.brushSize / this.ratio,
      0,
      2 * Math.PI
    );
    context.fill();

    window.requestAnimationFrame(this.draw.bind(this));
  }
}

export default MaskEditor;
