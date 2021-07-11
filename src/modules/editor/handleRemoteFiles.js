import config from "../../config/index.js";
import logger from "../../util/logger.js";

/**
 * Handle local file usage for the editor
 * Shows a modal dialog that allows drag/drop or regular file selector menu uploads
 * @param editor: TokenEditor ui instance
 */
const handleRemoteFiles = () => {
  return new Promise(async (resolve, reject) => {
    // creating the modal
    logger.info(
      "Rendering partial",
      config.templates.partials.ADD_LAYER_REMOTE
    );
    const html = await renderTemplate(
      config.templates.partials.ADD_LAYER_REMOTE,
      {}
    );

    const modal = new window.vtta.ui.Modal(
      "handle-file-remote",
      "Add layer from URL",
      html,
      [window.vtta.ui.BUTTON_OK, window.vtta.ui.BUTTON_CANCEL]
    );

    // show the modal and await the response
    modal.show().then((response) => {
      if (response.button !== "OK") return;
      resolve(response.data.url);
    });
  });
};

export default handleRemoteFiles;
