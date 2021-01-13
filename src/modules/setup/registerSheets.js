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

  // register tokenizer on all character (npc and pc) sheets
  sheetNames.forEach((sheetName) => {
    Hooks.on("render" + sheetName, (app, html, data) => {
      logger.info(`Sheet ${sheetName} rendered. Registering Hook`);

      $(html).each(() => {
        // const headerButton = $(
        //   `<div class="vtta button"><img src="modules/vtta-core/public/img/vtta-logo.svg">Edit Token</div>`
        // );

        const headerButton = $(
          `<a><i class="fas fa-paint-brush"></i></i>VTTA Tokens</a>`
        );

        const headerButtonExists = $(html).find(
          "header.window-header div.vtta.button"
        ).length;
        if (headerButtonExists) return;

        const editor = new App({}, app.entity);

        $(headerButton).insertBefore(
          $(html).find("header.window-header a").first()
        );

        $(headerButton).on("click", (event) => {
          event.preventDefault();
          if (editor.rendered) {
            editor.bringToTop();
          } else {
            editor.render(true);
          }
        });
      });
    });
  });
}
