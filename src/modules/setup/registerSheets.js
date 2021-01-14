import logger from "../../util/logger.js";
import config from "../../config/index.js";
//import EditorUI from "../../apps/EditorUI.js";
import App from "../editor/App.js";

export default function () {
  let sheetNames = Object.values(CONFIG.Actor.sheetClasses)
    .reduce((arr, classes) => {
      return arr.concat(Object.values(classes).map((c) => c.cls));
    }, [])
    .map((cls) => cls.name);

  logger.info("Registering sheets", sheetNames);

  sheetNames.forEach((sheetName) => {
    Hooks.on("get" + sheetName + "HeaderButtons", (sheet, buttons, options) => {
      logger.info("getActorSheetHeaderButtons called", [
        sheet,
        buttons,
        options,
      ]);
      const editor = new App({}, sheet.object);

      if (
        buttons.find((button) => button.label === "VTTA Tokens") === undefined
      ) {
        const button = {
          label: "VTTA Tokens",
          icon: "fas fa-paint-brush",
          class: "vtta-tokens",
          onclick: (event) => {
            event.preventDefault();
            if (editor.rendered) {
              editor.bringToTop();
            } else {
              editor.render(true);
            }
          },
        };
        logger.info("Adding button", button);
        buttons.unshift(button);
      }
    });
  });
}
