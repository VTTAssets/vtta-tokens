import config from "../config/index.js";
import TokenEditor from "../modules/_TokenEditor/index.js";
import Layer from "../modules/_TokenEditor/Layer/index.js";
import logger from "../util/logger.js";
import Color from "../modules/_TokenEditor/Mask/Color.js";

import CONSTANTS from "../modules/_TokenEditor/constants.js";

import handleLocalFiles from "./EditorUI/handleLocalFiles.js";

/**
 * This is the UI application for the TokenEditor
 */
class EditorUI extends FormApplication {
  constructor(options, actor) {
    super(options);
    this.actor = actor;

    this.tokenSize = parseInt(
      game.settings.get(config.module.name, "tokenSize")
    );
    this.editor = new TokenEditor(this.tokenSize);

    // get the actor image to load it
    this.preview = null;

    this.mouse = {
      x: null,
      y: null,
      color: null,
    };

    this.activeLayerId = null;
  }

  /** @override */
  static get defaultOptions() {
    return Object.assign(super.defaultOptions, {
      width: 720,
      resizeable: true,
      height: "auto",
      classes: ["vtta", "ui", "tokens"],
      template: "modules/vtta-tokens/src/templates/editor.handlebars",
    });
  }

  async getData() {
    if (this.editor.layers.length === 0) {
      let defaultFrameUrl =
        this.actor.data.type === "character"
          ? game.settings.get(config.module.name, "defaultPCFrame")
          : game.settings.get(config.module.name, "defaultNPCFrame");
      defaultFrameUrl =
        window.vtta.settings.ImageFilePicker.getUrl(defaultFrameUrl);

      const frameLayer = await Layer.fromUrl(this.tokenSize, defaultFrameUrl);
      this.editor.addLayer(frameLayer);
      //this.editor.createMaskFromLayer(frameLayer.id);

      const profileLayer = await Layer.fromUrl(
        this.tokenSize,
        this.actor.data.img
      );
      this.editor.addLayer(profileLayer);
      //this.editor.setLayerMask(profileLayer.id, 1);
    }

    return this.editor.getData();
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @returns {Promise}         A Promise which resolves once the update operation has completed
   * @abstract
   */
  async _updateObject(event, formData) {
    event.preventDefault();

    this.close();
  }

  /**
   * Enables dragging
   * @param {Event} event
   */
  onMouseDown(event) {
    this.mouse = Object.assign(this.mouse, {
      x: event.clientX,
      y: event.clientY,
      dragging: true,
    });
  }

  /**
   * Disables dragging
   * @param {Event} event
   */
  onMouseUp(_) {
    this.mouse = Object.assign(this.mouse, {
      dragging: false,
    });
  }

  /**
   * Enables color picking on the current view canvas and (if a drag event is registered) translation
   * of the source image on the view canvas
   * @param {Event} event
   */
  onMouseMove(event) {
    var eventLocation = this.getEventLocation(this.preview, event);
    // Get the data of the pixel according to the location generate by the getEventLocation function
    const cursor = this.preview
      .getContext("2d")
      .getImageData(eventLocation.x, eventLocation.y, 1, 1).data;
    this.mouse.color = new Color(cursor[0], cursor[1], cursor[2], cursor[3]);
    let delta = {
      x: this.mouse.x - event.clientX,
      y: this.mouse.y - event.clientY,
    };

    if (this.mouse.dragging) {
      // move all layers if the mouse key is pressed down
      this.editor.translate(delta.x, delta.y);
      //this.editor.draw();
      // this.render(true);
    }

    this.mouse = Object.assign(this.mouse, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  /**
   * Gets the view canvas position on the current page, which is necessary to allow a fluid mousewheel zoom
   * @param {HTMLElement} element
   * @param {Event} event
   */
  getEventLocation(element, event) {
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
  }

  /**
   * Scales the source image on mouse wheel events
   * @param {Event} event
   */
  onWheel(event) {
    event.preventDefault();

    if (event.shiftKey) {
      let degree = event.deltaY / 100;
      this.editor.rotate(degree);
    } else {
      var eventLocation = this.getEventLocation(this.preview, event);

      let scaleDirection = event.deltaY / 100;
      if (scaleDirection < 0) {
        this.editor.zoomIn();
      } else {
        this.editor.zoomOut();
      }
    }
  }

  draw() {
    this.editor.draw();
    window.requestAnimationFrame(this.draw.bind(this));
  }

  setup(html) {
    // adjust the editor canvas to desired target size
    this.preview = $(html).find("#preview")[0];

    $(this.preview).attr("width", `${this.tokenSize}`);
    $(this.preview).attr("height", `${this.tokenSize}`);

    // add event listeners for translation/scaling of the active layer
    this.preview.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.preview.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.preview.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.preview.addEventListener("wheel", this.onWheel.bind(this), {
      passive: false,
    });

    this.editor.setCanvas(this.preview);
    // submenu's are hidden per default
    //  $(html).find(".submenu").hide();
    $(html).find(".modal").hide();

    // Add the outlines for all layers
    this.editor.layers.forEach((layer) => {
      $(html)
        .find(`div.layer[data-id='${layer.id}'] div.outline`)
        .append(layer.outline);
    });

    // Add the blendmodes to the dropdown
    const blendModes = [];
    for (let blendMode in CONSTANTS.blendmodes) {
      blendModes.push({
        id: blendMode,
        name: CONSTANTS.blendmodes[blendMode],
        title: game.i18n.localize("BLEND_MODE." + blendMode + ".description"),
      });
    }
    $('div.pane.activeLayer select[name="change-blendmode"]').append(
      blendModes
        .map(
          (blendMode) =>
            `<option value="${blendMode.name}" title="${blendMode.title}">${blendMode.name}</option>`
        )
        .join("")
    );
  }

  pickColor(html) {
    return new Promise((resolve, reject) => {
      const $colorInput = $(html).find("input[type='color']").first();
      $colorInput.click();

      $colorInput.on("change", (event) => {
        resolve($(event.currentTarget).val());
      });
    });
  }

  activateListeners(html) {
    this.draw();
    this.setup(html);

    /*
     * Active Layer
     */
    // ui elements
    const blendMode = $("div.pane.activeLayer").find("select").first();
    const opacity = $("div.pane.activeLayer").find("input").first();

    // activate / deactivate layer
    $(html)
      .find("div.layer")
      .click((event) => {
        const $layer = $(event.currentTarget);
        const layerId = $layer.data().id;

        // failsave
        if (!layerId) return;

        if (layerId === this.activeLayerId) {
          // de-select the currently active layer
          $layer.removeClass("active");
          this.editor.applyLock(layerId);
          this.activeLayerId = null;

          $(blendMode).val(CONSTANTS.blendmodes.SOURCE_OVER);
          $(blendMode).attr("disabled", true);
          $(opacity).val("100");
          $(opacity).attr("disabled", true);

          // disable the active layer submenu
          $("div.submenu[data-name='active-layer']").addClass("inactive");
        } else {
          // lock the previously active layer, if any
          if (this.activeLayerId) this.editor.applyLock(this.activeLayerId);
          // unlock the new layer
          $(".pane.layers div.layer.active").removeClass("active");
          this.activeLayerId = layerId;
          this.editor.removeLock(this.activeLayerId);
          $layer.addClass("active");
          const layer = this.editor.getLayer(this.activeLayerId);

          const option = $(blendMode).find(
            `option[value='${layer.blendMode}']`
          );

          $(option).prop("selected", true);
          $(blendMode).attr("disabled", false);
          $(opacity).val(Math.round(layer.opacity * 100));
          $(opacity).attr("disabled", false);

          $("div.submenu[data-name='active-layer']").removeClass("inactive");
        }
      });

    $(blendMode).on("change", (event) => {
      if (!this.activeLayerId) return;
      this.editor.setLayerBlendMode(
        this.activeLayerId,
        $(event.currentTarget).val()
      );
    });

    $(opacity).on("change", (event) => {
      if (!this.activeLayerId) return;
      this.editor.setLayerOpacity(
        this.activeLayerId,
        parseInt($(event.currentTarget).val())
      );
    });

    $(opacity).on("input", (event) => {
      if (!this.activeLayerId) return;
      this.editor.setLayerOpacity(
        this.activeLayerId,
        parseInt($(event.currentTarget).val())
      );
    });

    // Interacting with individual layers
    $(html)
      .find('div.layer > div > div[data-type="action"]')
      .click((event) => {
        const data = $(event.currentTarget).data();
        const layerId = $(event.currentTarget).parent().parent().data("id");

        switch (data.action) {
          case "remove":
            this.editor.removeLayer(layerId);
            break;
          case "reset":
            this.editor.resetLayer(layerId);
            break;
          case "lock":
            this.editor.applyLock(layerId);
            break;
          case "unlock":
            this.editor.removeLock(layerId);
            break;
          case "mask":
            // get the current mask id
            const currentMaskId = this.editor.getLayerMaskId(layerId);
            const currentMaskIndex = this.masks.findIndex(
              (mask) => mask.id === currentMaskId
            );
            const nextMaskIndex =
              currentMaskIndex === -1 ? 0 : currentMaskIndex + 1;
            if (nextMaskIndex >= this.masks.length) nextMaskIndex = null;

            this.editor.applyMask(layerId);
            break;
          case "unmask":
            this.editor.removeMask(layerId);
            break;
          case "show":
            this.editor.applyVisibility(layerId);
            break;
          case "hide":
            this.editor.removeVisibility(layerId);
            break;

          default:
            console.log("Unknown action: " + data.action);
        }
        this.render(true);
      });

    // draw the composite
    this.editor.draw();

    $(html)
      .find("a.button")
      .on("click", async (event) => {
        event.preventDefault();
        if ($(event.currentTarget).hasClass("disabled")) return;

        const data = $(event.currentTarget).data();
        if (!data.action) return;

        switch (data.action) {
          case "add-layer-tint":
            const color = await this.pickColor(html);

            const layer = await Layer.fromColor(this.tokenSize, color);
            this.editor.addLayer(layer);
            this.render(true);

            break;
          case "open-submenu":
            // hide existing submenus
            $(".submenu").hide(200);
            // get the submenu
            const submenuName = data.target;
            const submenu = $(`.submenu[data-name=${submenuName}]`);
            if (submenu) {
              submenu.show(700, function () {
                $(this).on("mouseleave", () => {
                  $(this).hide(700);
                });
              });
            }
            break;
          case "open-modal":
            // hide existing submenus
            // get the submenu
            const modalName = data.target;
            const modal = $(`.modal[data-name=${modalName}]`);
            if (modal) {
              $(modal).fadeIn(100);

              switch (modalName) {
                case "add-layer-local":
                  // watch for upload
                  const images = await handleLocalFiles(modal);

                  const imageLayers = images.map((file) =>
                    Layer.fromImage(this.tokenSize, file.name, file.img)
                  );

                  Promise.allSettled(imageLayers)
                    .then((layers) => {
                      return layers
                        .filter(
                          (layer) =>
                            layer.status && layer.status === "fulfilled"
                        )
                        .map((layer) => layer.value);
                    })
                    .then((layers) => {
                      // all layers that were able to load are loaded
                      layers.forEach((layer) => {
                        this.editor.addLayer(layer);
                      });
                      this.render(true);
                    });

                  break;
                case "add-layer-url":
                  $(modal).on("");
                  break;
              }

              // there are two modals possible: Uploading a picture from local drive or
              // uploading it from an URL
            }
            break;
        }
      });

    // add the debug stuff
    $(html).find('section[name="debug"]').append("<h4>Layers</h4>");
    this.editor.layers.forEach((layer) => {
      $(html).find('section[name="debug"]').append(layer.canvas.raw);
    });
    $(html).find('section[name="debug"]').append("<h4>Masks</h4>");
    // this.editor.masks.forEach((mask) => {
    //   $(html).find('section[name="debug"]').append(mask.layer.canvas);
    // });
    // $(html).find('section[name="debug"]').append(this.editor.getMask());

    super.activateListeners(html);
  }
}

export default EditorUI;
