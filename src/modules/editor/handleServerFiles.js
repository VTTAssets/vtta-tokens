import config from "../../config/index.js";
import logger from "../../util/logger.js";

/**
 * Handle local file usage for the editor
 * Shows a modal dialog that allows drag/drop or regular file selector menu uploads
 * @param editor: TokenEditor ui instance
 */
const handleServerFiles = () => {
  return new Promise(async (resolve, reject) => {
    new FilePicker({
      type: "image",
      callback: (path) => {
        resolve(path);
      },
    }).browse();
  });
};

export default handleServerFiles;
