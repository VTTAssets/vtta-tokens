import Editor from "./Editor.js";
import Layer from "./Layer.js";
import config from "../../config/index.js";
import handleLocalFiles from "./handleLocalFiles.js";
import handleRemoteFiles from "./handleRemoteFiles.js";
import handleServerFiles from "./handleServerFiles.js";
import logger from "../../util/logger.js";

class UI {
  constructor(html) {
    this.html = html;
    this.actor = null;

    this.editor = new Editor(480);
    this.editor.addEventListener("update", (e) => {
      this.displayData(e.detail);
    });

    // add the editor output to the html
    $(html).find(".canvas").append(this.editor.canvas);

    this.$loading = $(html).find(".loading");

    // get the controls-panel and specific elements within that
    this.$controls = $(html).find(".controls").first();
    this.$activeLayer = $(this.$controls).find(".activeLayer").first();
    this.$tokenImages = $(html).find(".tokenImages").first();
    this.$tokenFilename = $(html).find("section.tokenFilename").first();

    this.$targetTokenFilePath = $(html)
      .find("input[name='targetTokenFilePath']")
      .first();

    this.$ok = $(html).find('footer.buttons button[name="OK"]').first();
    this.$close = $(html).find('footer.buttons button[name="CLOSE"]').first();

    // insert the blendmodes
    Editor.BLEND_MODES.forEach((blendmode) => {
      $(this.$activeLayer)
        .find("select")
        .append(
          $(
            `<option title="${game.i18n.localize(
              "BLEND_MODE." +
                blendmode.replace(/\-/g, "_").toUpperCase() +
                ".description"
            )}" (value="${blendmode}">${blendmode}</option>`
          )
        );
    });

    this.$layers = $(this.$controls).find(".layers").first();
    this.$layerManagement = $(this.$controls).find(".layerManagement").first();

    this.activeLayer = null;

    this.activateListeners();

    this.debug = false;
  }

  updateTargetTokenFilePath(event) {
    const targetTokenFilePath = $(event.target).val();

    // split it into path and filename
    const parts = targetTokenFilePath.split("/");
    const targetTokenFilename = parts.splice(parts.length - 1, 1)[0];
    const targetTokenPath = parts.join("/");

    this.$tokenFilename
      .find("input[name='targetTokenPath']")
      .val(targetTokenPath);
    this.$tokenFilename.find("div.directory").html(targetTokenPath + "/");
    this.$tokenFilename
      .find("input[name='targetTokenFilename']")
      .val(targetTokenFilename);
  }

  activateListeners() {
    const targetTokenFilePath = this.$tokenFilename.find(
      "input[name='targetTokenFilePath']"
    );
    $(targetTokenFilePath).on("change", (event) =>
      this.updateTargetTokenFilePath(event)
    );
    this.$tokenFilename
      .find("input[name='targetTokenFilename']")
      .on("input", (event) => {
        $(targetTokenFilePath).val(
          this.$tokenFilename.find("input[name='targetTokenPath']") +
            "/" +
            $(event.target).val()
        );
      });

    // add listeners to changes to the activeLayer controls
    const $alpha = $(this.$activeLayer).find(`input[name="alpha"]`);
    const changeAlpha = async (event) => {
      if (!this.activeLayer) return;

      const value = parseInt($(event.target).val()) / 100;
      const result = await this.editor.setLayerAlpha(this.activeLayer, value);
      this.displayData(result);
    };
    $alpha.on("change", changeAlpha);
    $alpha.on("input", changeAlpha);

    const $blendmode = $(this.$activeLayer).find(`select[name="blendmode"]`);
    $blendmode.on("change", async (e) => {
      if (!this.activeLayer) return;
      const value = $(e.target).val();
      const result = await this.editor.setLayerBlendmode(
        this.activeLayer,
        value
      );
      this.displayData(result);
    });

    // Layer Management
    $(this.$layerManagement)
      .find("button")
      .on("click", async (event) => {
        event.preventDefault();
        if ($(event.currentTarget).hasClass("disabled")) return;

        const data = $(event.currentTarget).data();
        if (!data.action) return;

        switch (data.action) {
          case "add-layer-tint":
            // done
            const color = await this.pickColor(this.html);
            const tint = await this.editor.addTint(color);
            this.displayData(this.editor.getData());
            break;

          case "add-layer-fvtt":
            const url = await handleServerFiles();
            if (url) {
              await this.editor.addServerImage(url, {
                fit: Layer.FIT_CONTAIN,
              });
              const data = this.editor.getData();

              this.editor.forceRedraw();
              this.displayData(data);
            }
            break;

          case "add-layer-profile":
            await this.editor.addServerImage(this.actor.img, {
              fit: Layer.FIT_COVER,
            });
            this.displayData(this.editor.getData());

            break;

          case "download":
            const link = document.createElement("a");
            link.download = this.actor.name + ".png";
            link.href = this.editor.canvas.toDataURL("image/png");
            link.click();
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
                  const localImages = await handleLocalFiles(modal);
                  const localImageLayers = localImages.map((file) =>
                    this.editor.addLocalImage(file, {
                      fit: Layer.FIT_COVER,
                    })
                  );
                  Promise.allSettled(localImageLayers)
                    .then(() => {
                      this.editor.forceRedraw();
                      this.displayData(this.editor.getData());
                    })
                    .catch((error) => {
                      logger.error(error);
                    });

                  break;
                case "add-layer-remote":
                  const serverFilePath = await handleRemoteFiles(modal);
                  if (serverFilePath) {
                    await this.editor.addRemoteImage(serverFilePath, {
                      fit: Layer.FIT_CONTAIN,
                    });
                    this.editor.forceRedraw();
                    this.displayData(this.editor.getData());
                  }
                  break;
              }

              // there are two modals possible: Uploading a picture from local drive or
              // uploading it from an URL
            }
            break;
        }
      });

    /**
     * Saving the image
     */
    $(this.$ok).on("click", (event) => {
      if (this.actor.data.token.randomImg) event.preventDefault();
      this.editor.getBlob().then(async (data) => {
        const filename = this.$tokenFilename
          .find("input[name='targetTokenFilename']")
          .val();
        const path = this.$tokenFilename
          .find("input[name='targetTokenPath']")
          .val();

        const details = window.vtta.settings.DirectoryPicker.parse(path);
        if (details.activeSource === "data") {
          // create the directory structure, if it does not exist already
          let subdirectories = details.current
            .split("/")
            .filter((subdirectory) => subdirectory.length > 0);
          let subdirectory = "";
          while (subdirectories.length) {
            subdirectory = subdirectory + "/" + subdirectories.splice(0, 1)[0];
            try {
              await FilePicker.createDirectory("data", subdirectory);
              logger.info(`[data] ${subdirectory} created`);
            } catch (error) {
              if (error.indexOf("EEXIST") === 0) {
                logger.info(`[data] ${subdirectory} already exists`);
              }
            }
          }
        }

        let file = new File([data], filename, { type: data.type });
        const result = await window.vtta.settings.DirectoryPicker.uploadToPath(
          path,
          file
        );

        if (result.status === "success" && result.message) {
          logger.info("Upload successful: ", result);

          const path = window.vtta.settings.DirectoryPicker.descriptorFromURL(
            result.path
          );
          window.vtta.ui.Notification.show(
            "Token created successfully",
            `<p>Image stored at <strong>${path}</strong></p>`,
            2000
          );

          delete this.actor._tokenImages;

          if (this.actor.data.token.randomImg) {
            await this.loadActorTokens();
          } else {
            // update the actor with the (perhaps new) token path
            if (result.path && result.path !== this.actor.data.token.img) {
              let tokenUrl = result.path.replace(/\?[t=]*\d+$/, "");
              tokenUrl = `${tokenUrl}?${+new Date()}`;
              await this.actor.update({
                "token.img": tokenUrl,
              });
            }
          }
        }
      });
    });

    // $(this.$close).on("click", (event) => {
    //   this.close();
    // });
  }

  pickColor(html) {
    return new Promise((resolve, reject) => {
      const $colorInput = $(html).find("input[type='color']").first();
      $colorInput.data("prevColor", $colorInput.val());
      $colorInput.click();

      $colorInput.on("change", (event) => {
        resolve($(event.currentTarget).val());
      });
    });
  }

  getDefaultFrame(actor) {
    const DEFAULT_FRAMES = {
      character: game.settings.get(config.module.name, "defaultPCFrame"),
      npc: game.settings.get(config.module.name, "defaultNPCFrame"),
    };

    let url = window.vtta.settings.ImageFilePicker.getUrl(
      DEFAULT_FRAMES[actor.data.type]
    );
    logger.info("Retrieving default frame from URL", url);
    return url;
  }

  async loadActorTokens() {
    const DirectoryPicker = window.vtta.settings.DirectoryPicker;

    const appendSuffix = (path, suffix = "token") => {
      const parts = path.split(".");
      parts[parts.length - 1] = `${suffix}.${parts[parts.length - 1]}`;
      return parts.join(".");
    };

    const replaceExtension = (path, newExtension = "png") => {
      const parts = path.split(".");
      parts[parts.length - 1] = newExtension;
      return parts.join(".");
    };

    const loadExistingTokens = async () => {
      let tokenImages = [];
      try {
        tokenImages = await this.actor.getTokenImages();
      } catch (error) {
        logger.error(
          "Could not retrieve the token images from the actor",
          error
        );
        return tokenImages;
      }
      this.$tokenImages.find(".content").empty();
      if (tokenImages.length) {
        const images = await Promise.allSettled(
          tokenImages.sort().map((imagePath) => {
            return new Promise((resolve, reject) => {
              const img = new Image();
              $(img).attr("title", imagePath);

              img.onload = () => {
                resolve(img);
              };
              img.onerror = (error) => {
                reject(error);
              };
              img.src = imagePath;
            });
          })
        );

        // go through all successfully loaded images and add them to the div
        images
          .filter((img) => img.status === "fulfilled")
          .map((img) => img.value)
          .forEach((img) => this.$tokenImages.find(".content").append(img));
        return tokenImages;
      } else {
        this.$tokenImages.find(".content").append($("<p>None</p>"));
        return [];
      }
    };

    const generateNextWildcardTokenFilename = (tokenFilenames) => {
      if (this.actor.data.token.img.indexOf("*") === -1) {
        // wildcard is set, but no wildcard found, let's hope the user knows what he is doing.
        return DirectoryPicker.descriptorFromURL(this.actor.data.token.img);
      }

      // generate a wildcard token filename based on the wildcard
      let count = 0;
      let generatedFilename = "";
      do {
        count++;
        const index = count.toString().padStart(3, "0");
        generatedFilename = this.actor.data.token.img
          .replace(/\?\d+$/, "")
          .replace(/\*/, index); // replace only the first wildcard to allow wildcard file extensions that are not getting replaced
      } while (
        tokenFilenames.find((filename) => filename === generatedFilename) !==
        undefined
      );
      return DirectoryPicker.descriptorFromURL(generatedFilename);
    };

    const isInsideRootDirectory = (path) => {
      const parts = path.split("/").filter((subPath) => subPath.length > 0);
      return parts.length === 0;
    };

    const generateDefaultPath = () => {
      const parts = [this.actor.data.type];

      if (this.actor.data.type === "npc") {
        if (
          this.actor.data.data &&
          this.actor.data.data.details &&
          this.actor.data.data.details.type &&
          typeof this.actor.data.data.details.type === "string" &&
          this.actor.data.data.details.type.length > 0
        ) {
          parts.push(
            this.actor.data.data.details.type.toLowerCase().replace(/\s/g, "")
          );
        }
      }

      return (
        game.settings.get("vtta-core", "actorImageDirectory") +
        "/" +
        parts.join("/") +
        "/" +
        this.actor.name.replace(/\s/g, "-") +
        ".token.png"
      );
    };

    const DEFAULT_TOKEN = "icons/svg/mystery-man.svg";
    const tokenImages = await loadExistingTokens();
    let baseTokenFilename = this.actor.data.token.img.replace(/\?\d+$/, "");

    const isWildCardToken =
      this.actor.data.token.randomImg && baseTokenFilename.indexOf("*") !== -1;

    const isDefaultTokenImage =
      this.actor.data.token.img === "" ||
      this.actor.data.token.img === null ||
      this.actor.data.token.img === DEFAULT_TOKEN;

    //let baseTokenFilename = this.actor.data.token.img;

    // remove any excess
    //baseTokenFilename = baseTokenFilename.replace(/\?t=\d+$/, "");

    if (isDefaultTokenImage) {
      baseTokenFilename = generateDefaultPath();
    } else {
      // if the actor profile image is the same as the actor token image, then it's using Foundry's failsave
      // to actually be able to save the token, we need to adjust this value
      if (baseTokenFilename === this.actor.data.img) {
        baseTokenFilename = replaceExtension(
          appendSuffix(this.actor.data.img),
          "png"
        );
      }

      let options = DirectoryPicker.optionsFromURL(baseTokenFilename);
      switch (options.activeSource) {
        case "data":
          // check if the path is set to the root, if that is true redirect to the default path
          // also redirect to default path if user has requested via config
          if (isInsideRootDirectory(options.current) || game.settings.get(config.module.name, "forceDefaultPathOnVTTServer")) {
            baseTokenFilename = generateDefaultPath();
          } else {
            baseTokenFilename =
              DirectoryPicker.descriptorFromURL(baseTokenFilename);
          }
          break;
        case "s3":
          baseTokenFilename =
            DirectoryPicker.descriptorFromURL(baseTokenFilename);
          break;
        case null:
          baseTokenFilename = generateDefaultPath();
          break;
      }
    }

    logger.info("Target token filename constructed", baseTokenFilename);

    /**
     In general, tokens will be saved along-side the profile image with a .token suffix
     
     Example:
     Profile image: some/path/some-filename.jpg 
     Token Image: some/path/some-filename.token.jpg

     Special cases:
     1. Wildcard tokens: The setting in the token is respected and it will be stored where configured. The file will always be saved as PNG in order 
        to preserve transparency though!
        some/path/actorname*.jpg -> some/path.actorname001.png, some/path.actorname002.png, some/path.actorname003.png ...
     2. Default Profile image (mystery man):
        Token Image: [vtta-core setting: default actor-related image path]/[npc|character]/[actor.details.type]/actorname.token.png
  

     */
    if (isWildCardToken) {
      baseTokenFilename = generateNextWildcardTokenFilename(tokenImages);
    }

    this.$tokenFilename
      .find("input[name='targetTokenFilePath']")
      .val(baseTokenFilename)
      .trigger("change");

    return baseTokenFilename;
  }

  async loadActor(actor) {
    this.actor = actor;
    await this.loadActorTokens();

    let frame = null;
    try {
      frame = await this.editor.addServerImage(this.getDefaultFrame(actor), {
        fit: Layer.FIT_COVER,
      });
      this.editor.toggleLayerLock(frame.content);
    } catch (error) {
      logger.error("Could not add Frame layer", error);
    }

    let avatar = null;
    try {
      avatar = await this.editor.addServerImage(actor.img, {
        fit: Layer.FIT_COVER,
      });
      if (frame !== null)
        this.editor.setForeignMask(avatar.content, frame.content);
    } catch (error) {
      logger.error("Could not add Layer: Actor profile image", error);
    }

    if (avatar && avatar.content && avatar.content.borderColor) {
      try {
        const tint = await this.editor.addTint(
          avatar.content.borderColor.toString()
        );
        this.editor.toggleLayerLock(tint.content);
        if (frame !== null) {
          this.editor.setForeignMask(tint.content, frame.content);
        }
      } catch (error) {
        logger.error("Could not apply default tint layer", error);
      }
    }

    this.editor.forceRedraw();
    const finishSetup = () => {
      this.editor.removeEventListener("DRAW_COMPLETED", finishSetup);
      const data = this.editor.getData();

      // await this.editor.draw();
      this.displayData(data);
      this.$loading.addClass("done");
    };
    this.editor.addEventListener("DRAW_COMPLETED", finishSetup);
    setTimeout(() => {}, 100);

    // // debug
    // if (this.debug) {
    //   $("body").append(tint.content.canvas);
    //   $("body").append(tint.content.mask);
    //   $("body").append(tint.content.foreignMask);
    // }
  }

  async fakeInitialize() {
    const actor = {
      img: "https://preview.redd.it/md29eaibwop21.jpg?width=640&crop=smart&auto=webp&s=1e040d65e0d9ff76245885408efb2b68a2d44efd",
      type: "pc",
    };

    return this.loadActor(actor);
  }

  setActiveLayer(layerId = null) {
    const $alpha = $(this.$activeLayer).find(`input[name="alpha"]`);
    const $blendmode = $(this.$activeLayer).find(`select[name="blendmode"]`);

    if (layerId) {
      $(this.$activeLayer).removeClass("disabled");
      this.activeLayer = layerId;
      const layerData = this.editor.getLayerOptions(this.activeLayer);
      $alpha.attr("disabled", false);
      $blendmode.attr("disabled", false);

      if (layerData.alpha) {
        $alpha.val("" + Math.round(layerData.alpha * 100));
      }
      if (layerData.blendmode) {
        $blendmode.val(layerData.blendmode);
      }
    } else {
      this.activeLayer = null;
      $(this.$activeLayer).addClass("disabled");
      $alpha.attr("disabled", true);
      $alpha.val("100");
      $blendmode.attr("disabled", true);
      $blendmode.val(Editor.BLEND_MODE_DEFAULT);
    }
  }

  displayData(data) {
    // clear the layers
    $(this.$layers).empty();

    // create arrow up/down section
    const createReorderSection = (control, layer) => {
      if (layer.canMoveUp) {
        $(control).find("div.reorder").append(`<div
                            data-type="action"
                            data-target="${layer.id}"
                            data-action="move:up"
                          >
                            <i class="fa fa-angle-up"></i>
                          </div>`);
      }

      if (layer.canMoveDown) {
        $(control).find("div.reorder").append(`<div
                            data-type="action"
                            data-target="${layer.id}"
                            data-action="move:down"
                          >
                            <i class="fa fa-angle-down"></i>
                          </div>`);
      }
      return control;
    };

    // add canvas and mask thumbnails to the control
    const appendThumbnails = (control, layer) => {
      $(control).find("div.thumbnail.canvas").append(layer.thumbnails.canvas);
      $(control).find("div.thumbnail.mask").append(layer.thumbnails.mask);
      return control;
    };

    // create a control from html snippet
    const createControl = (id, layer) => {
      const html = `   
        <div class="control" data-layer="${layer.id}" id="layer-${layer.id}" >
        <input id="colorpicker-${layer.id}" type="color" value="${layer.color
        .toString()
        .substr(
          0,
          7
        )}" tabindex="-1" style="opacity: 0; visibility: hidden; position: absolute;" />
                <div class="index" title="ID, click to activate this layer in order to edit it's blend mode and/or opacity"><div>${id}</div></div>
           
                      
                <div class="thumbnail canvas" title="Thumbnail"></div>
                <div class="thumbnail mask" data-layer="${
                  layer.id
                }" title="Mask, click to edit"></div>

                 <div class="action mask ${
                   layer.foreignMask ? "masked" : ""
                 }" data-type="action" data-action="mask" data-target="${
        layer.id
      }" data-source="${
        layer.foreignMaskId !== null ? "" : layer.foreignMask
      }" title="Click to cycle through all layer masks to apply a mask">
                    <i class="fas fa-mask ${
                      layer.foreignMaskId !== null ? "active" : "inactive"
                    }"></i>
                    <div class="index"><div>${layer.foreignMask}</div></div>
                </div>

                <div class="action visibility" data-action="visibility" data-type="action" data-target="${
                  layer.id
                }" title="Click to ${
        layer.isVisible ? "hide" : "show"
      } layer, includes current opacity">
                    <i class="fas fa-eye ${
                      layer.isVisible ? "active" : "inactive"
                    }"></i>
                    <div class="alpha"><div>${layer.alpha}%</div></div>
                </div>
                
                <!-- mirror -->
                 <div class="action mirror" data-action="mirror"  data-type="action" data-target="${
                   layer.id
                 }" title="Flip layer vertically">
                    <i class="fas fa-exchange-alt active"></i>
                </div>

                <!-- Reset transform -->
                <div class="action reset" data-action="reset"  data-type="action" data-target="${
                  layer.id
                }" title="Reset all transformations (move, scale or rotate)">
                    <i class="fas fa-compress-arrows-alt ${
                      layer.isChanged ? "active" : "inactive"
                    }"></i>
                </div>

                <!-- lock -->
                <div class="action lock" data-action="lock" data-type="action" data-target="${
                  layer.id
                }" title="Click to ${
        layer.isLocked ? "unlock" : "lock"
      } layer for moving, scaling or rotating">
                    <i class="fas fa-lock ${
                      layer.isLocked ? "active" : "inactive"
                    }"></i>
                </div>
                
               
                <!-- Cloning -->
                <div class="action clone" data-action="clone"  data-type="action" data-target="${
                  layer.id
                }" title="Clone layer">
                    <i class="fas fa-clone active"></i>
                </div>

                <!-- delete -->
                <div class="action delete" data-action="delete"  data-type="action" data-target="${
                  layer.id
                }" title="Delete">
                    <i class="fas fa-trash-alt active" style="color: rgb(252, 116, 115)"></i>
                </div>
          
            <div class="reorder"></div>
        </div>
        `;

      let control = $(html);

      let selectedLayerIndex = null;

      control = createReorderSection(control, layer);
      control = appendThumbnails(control, layer);

      $(control).on("mouseenter", (e) => {
        $(control).find(".hideable").removeClass("hidden");
      });

      $(control).on("mouseleave", (e) => {
        $(control).find(".hideable").addClass("hidden");
      });

      $(control)
        .find(".index")
        .on("mousedown", (e) => {
          const control = $(e.currentTarget).parent();
          const data = $(control).data();
          selectedLayerIndex = $(control).index() + 1;
          $(control).parent().find("div.control").removeClass("active");
          if (data.layer === this.activeLayer) {
            this.setActiveLayer(null);
          } else {
            this.setActiveLayer(data.layer);
            $(control).addClass("active");
          }
        });

      $(control).attr("draggable", true);
      $(control).on("dragover", (e) => {
        e.preventDefault();
      });
      $(control).on("drop", async (e) => {
        e.dataTransfer = e.originalEvent.dataTransfer;
        const from = e.dataTransfer.getData("text");
        const to = $(e.currentTarget).data().layer;
        const result = await this.editor.swapLayers(from, to);
        this.displayData(result);
      });

      $(control).on("dragstart", (e) => {
        e.dataTransfer = e.originalEvent.dataTransfer;
        const data = $(e.currentTarget).data();

        e.dataTransfer.setData("text", data.layer);
      });
      return control;
    };

    // generate html snippet for an image layer (remote and local)
    const createImageLayerControl = (id, layer) => {
      return createControl(layer, html);
    };

    if (this.activeLayer !== null) {
    }

    // traverse through the layers
    data.layers.forEach((layer, index) => {
      if (index > 0 && data.layers.length > 1) {
        layer.canMoveDown = true;
      } else {
        layer.canMoveDown = false;
      }

      if (index < data.layers.length - 1 && data.layers.length > 1) {
        layer.canMoveUp = true;
      } else {
        layer.canMoveUp = false;
      }

      // get the identifier of the foreignMaskID
      if (layer.foreignMaskId !== null) {
        layer.foreignMask = this.editor.calculateLayerIdentifier(
          layer.foreignMaskId
        );
      } else {
        layer.foreignMask = "";
      }

      let control = null;

      switch (layer.type) {
        case Layer.TYPE_REMOTE_IMAGE:
        case Layer.TYPE_LOCAL_IMAGE:
        case Layer.TYPE_SERVER_IMAGE:
          control = createControl(
            this.editor.calculateLayerIdentifier(layer),
            layer
          );

          break;
        case Layer.TYPE_TINT:
          control = createControl(
            //createTintLayerControl(
            this.editor.calculateLayerIdentifier(layer),
            layer
          );
          $(control)
            .find("div.thumbnail.canvas")
            .on("click", async (e) => {
              const pickColor = (layer) => {
                return new Promise((resolve, reject) => {
                  const $colorInput = $("#colorpicker-" + layer.id);
                  $colorInput.data("prevColor", $colorInput.val());
                  $colorInput.click();

                  $colorInput.on("change", (event) => {
                    resolve($(event.currentTarget).val());
                  });
                });
              };

              const color = await pickColor(layer);
              this.editor.setLayerColor(layer, color);
              this.delayedUpdate();
            });
          break;
      }

      // do not crash is something is not working correctly, just continue with the next layer
      if (!control) return;

      if (control.attr("data-layer") === this.activeLayer)
        $(control).addClass("active");

      // add generic button logic to this layer
      $(control)
        .find('div[data-type="action"]')
        .click(async (e) => {
          let isChanged = false;
          const data = $(e.currentTarget).data();
          logger.debug("Action choosen: " + data.action);
          switch (data.action) {
            case "visibility":
              await this.editor.toggleLayerVisibility(data.target);
              isChanged = true;
              break;
            case "lock":
              await this.editor.toggleLayerLock(data.target);
              isChanged = true;
              break;
            case "mask":
              await this.editor.cycleLayerForeignMask(data.target);
              isChanged = true;
              break;
            case "move:up":
              await this.editor.moveLayer(data.target, Editor.DIRECTION_UP);
              isChanged = true;
              break;
            case "move:down":
              await this.editor.moveLayer(data.target, Editor.DIRECTION_DOWN);
              isChanged = true;
              break;
            case "clone":
              const result = await this.editor.cloneLayer(data.target);
              isChanged = true;
              break;
            case "reset":
              await this.editor.resetLayer(data.target);
              isChanged = true;
              break;
            case "mirror":
              await this.editor.mirrorLayer(data.target);
              isChanged = true;
              break;
            case "delete":
              await this.editor.deleteLayer(data.target, Editor.DIRECTION_DOWN);
              isChanged = true;
              break;
          }

          if (isChanged) {
            //this.delayedUpdate();
            const data = this.editor.getData();
            // this.editor.forceRedraw();
            this.displayData(data);
          }
        });

      // mask editor
      $(control)
        .find("div.thumbnail.mask")
        .on("click", async (e) => {
          const data = $(e.currentTarget).data();
          await this.editor.editLayerMask(data.layer);
        });

      $(this.$layers).prepend(control);
    });
  }

  delayedUpdate(timeout = 50) {
    setTimeout(() => {
      const data = this.editor.getData();
      this.editor.forceRedraw();
      this.displayData(data);
    }, timeout);
  }
}

export default UI;
