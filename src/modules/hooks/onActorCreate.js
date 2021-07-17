import config from "../../config/index.js";
import logger from "../../util/logger.js";
import Editor from "../editor/Editor.js";
import Layer from "../editor/Layer.js";
import { slugify } from "../../util/string.js";

// window.dispatchEvent(new CustomEvent("vtta-ddb.create-token", { detail: { actorId: "someid" }}));

const generateTargetPath = (actor) => {
  const parts = [actor.type];

  if (actor.type === "npc") {
    if (
      actor.data &&
      actor.data.details &&
      actor.data.details.type &&
      typeof actor.data.details.type === "string" &&
      actor.data.details.type.length > 0
    ) {
      parts.push(actor.data.details.type.toLowerCase().replace(/\s/g, ""));
    }
  }

  return `${game.settings.get("vtta-core", "actorImageDirectory")}/${parts.join(
    "/"
  )}`;
};

const upload = (url, path, filename, overwriteExisting = false) => {
  return new Promise(async (resolve, reject) => {
    const img = await window.vtta.image.download(url);

    const extension = url.toLowerCase().split(".").pop();

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(
      (blob) => {
        window.vtta.image
          .upload(path, filename, blob, overwriteExisting)
          .then((result) => resolve(result));
      },
      "image/" + extension,
      1
    );
  });
};

const onActorCreate = async (entity, options, user) => {
  if (
    game.settings.get(config.module.name, "automaticTokenGeneration") === false
  )
    return;
  const actor = entity.data;
  if (
    actor.type === "npc" &&
    actor.flags &&
    actor.flags.vtta &&
    actor.flags.vtta.id
  ) {
    logger.info("Creating token for NPC " + actor.name);

    const ImageFilePicker = window.vtta.settings.ImageFilePicker;

    let targetPath = generateTargetPath(actor);
    let targetActorFilename = "";
    let targetTokenFilename = "";

    const currentActorFilename = new URL(actor.img).pathname.split("/").pop();
    const actorFileExtension = currentActorFilename.split(".").pop();
    const actorBasename = currentActorFilename.replace(
      "." + actorFileExtension,
      ""
    );

    let OVERWRITE_EXISTING = true;
    // check if is the default image for this "type" of npc, e.g. beast, giant, ...
    if (actor.data.details.type === actorBasename) {
      // save the default images only once, but not under each actor's name to save disk space
      targetPath = `${game.settings.get(
        "vtta-core",
        "actorImageDirectory"
      )}/npc`;
      targetActorFilename = `${actor.data.details.type}.${actorFileExtension}`;
      targetTokenFilename = `${actor.data.details.type}.token.png`;
      OVERWRITE_EXISTING = false;
    } else {
      targetActorFilename = `${slugify(actor.name)}.${actorFileExtension}`;
      targetTokenFilename = `${slugify(actor.name)}.token.png`;
    }

    logger.info("Uploading actor image to designated folder", [
      actor.img,
      targetPath,
      targetActorFilename,
    ]);
    // upload the remote image to the server before we process it
    let result = await upload(
      actor.img,
      targetPath,
      targetActorFilename,
      OVERWRITE_EXISTING
    );
    if (result.status === "success") actor.img = result.path;

    /**
     * Ramping up the editor
     */
    const tokenSize = game.settings.get(config.module.name, "tokenSize");
    const defaultNPCFrame = game.settings.get(
      config.module.name,
      "defaultNPCFrame"
    );
    const editor = new Editor(tokenSize);
    // now add the images to the editor and complete the operation
    let frame, avatar;
    try {
      frame = await editor.addServerImage(
        ImageFilePicker.getUrl(defaultNPCFrame),
        {
          fit: Layer.FIT_COVER,
        }
      );
    } catch (error) {
      logger.error("Could not add Frame layer", error);
    }

    try {
      if (
        actor.flags.vtta.token &&
        actor.flags.vtta.token.x &&
        actor.flags.vtta.token.y &&
        actor.flags.vtta.token.zoomFactor
      ) {
        logger.info(
          "Received pre-defined token adjustments on actor",
          actor.flags.vtta.token
        );
        avatar = await editor.addServerImage(actor.img, {
          fit: Layer.FIT_PREDEFINED,
          x: actor.flags.vtta.token.x,
          y: actor.flags.vtta.token.y,
          zoomFactor: actor.flags.vtta.token.zoomFactor,
        });
      } else {
        logger.info(
          "Creating token based on an educated guess for the area of interest",
          actor.flags.vtta.token
        );
        avatar = await editor.addServerImage(actor.img, {
          fit: Layer.FIT_COVER,
        });
      }
      if (frame !== null) editor.setForeignMask(avatar.content, frame.content);
    } catch (error) {
      logger.error("Could not add Layer: Actor profile image", error);
    }

    // Background tint
    try {
      const backgroundColor =
        actor.flags.vtta.token && actor.flags.vtta.token.bg
          ? actor.flags.vtta.token.bg
          : avatar && avatar.content && avatar.content.borderColor
          ? avatar.content.borderColor.toString()
          : null;
      if (backgroundColor) {
        const tint = await editor.addTint(backgroundColor);
        if (frame !== null) editor.setForeignMask(tint.content, frame.content);
      }
    } catch (error) {
      logger.error("Could not apply default tint layer", error);
    }

    const saveToken = () => {
      logger.info("Editor signaled the completed draw");
      // removing the event listener again
      editor.removeEventListener("DRAW_COMPLETED", saveToken);
      editor.getBlob().then(async (blob) => {
        let result = await window.vtta.image.upload(
          targetPath,
          targetTokenFilename,
          blob,
          OVERWRITE_EXISTING
        );
        if (result.status === "success") {
          actor.token.img = result.path;

          const updateData = {
            _id: actor._id,
            img: actor.img,
            token: {
              img: actor.token.img,
            },
          };
          logger.info("Updating actor", updateData);
          if (window.vtta.postEightZero) {
            await Actor.updateDocuments([updateData]);
          } else {
            await Actor.update(updateData);
          }

          window.vtta.ui.Notification.show(
            `${actor.name}: Token generated successfully`,
            `<ul><li><strong>Actor image:</strong> ${targetPath}/${targetActorFilename}</li><li><strong>Token image:</strong> ${targetPath}/${targetTokenFilename}</li>`
          );
        }
      });
    };
    editor.draw();
    editor.addEventListener("DRAW_COMPLETED", saveToken);

    // setTimeout(async () => {
    //   // get the result
    //   editor.getBlob().then(async (blob) => {
    //     let result = await window.vtta.image.upload(
    //       targetPath,
    //       targetTokenFilename,
    //       blob,
    //       OVERWRITE_EXISTING
    //     );
    //     if (result.status === "success") {
    //       actor.token.img = result.path;

    //       const updateData = {
    //         _id: actor._id,
    //         img: actor.img,
    //         token: {
    //           img: actor.token.img,
    //         },
    //       };
    //       logger.info("Updating actor", updateData);
    //       await Actor.update(updateData);

    //       window.vtta.ui.Notification.show(
    //         `${actor.name}: Token generated successfully`,
    //         `<ul><li><strong>Actor image:</strong> ${targetPath}/${targetActorFilename}</li><li><strong>Token image:</strong> ${targetPath}/${targetTokenFilename}</li>`
    //       );
    //     }
    //   });
    // }, 1000);
  }
};

export default onActorCreate;
