import logger from "../../util/logger.js";
import config from "../../config/index.js";
import EditorUI from "../../apps/EditorUI.js";

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

      $(html)
        .find(
          config.sheets.profileImageClasses.map((cls) => `img${cls}`).join(", ")
        )
        .each((index, image) => {
          // create a new editor for this actor
          const editorUI = new EditorUI({}, app.entity);

          const profileButton = $(
            `<div class="vtta ui profile-button" style="top: ${
              $(image).position().top + "px"
            }; left: ${$(image).position().left + "px"}; width: ${
              $(image).width() + "px"
            }; height: ${
              $(image).height() + "px"
            }"><button class="vtta ui button small"><i class="fas fa-user-circle"></i> Edit Token</button></div>`
          );
          const button = $(profileButton).find("button");

          $(image).after(profileButton);

          $(button).hide();

          $(profileButton).on("mouseenter", (event) => {
            $(button).fadeIn(100);
          });
          $(profileButton).on("mouseleave", (event) => {
            $(button).fadeOut(100);
          });

          $(profileButton).on("click", (event) => {
            if (event.target.tagName === "BUTTON") {
              if (editorUI.rendered) {
                editorUI.bringToTop();
              } else {
                editorUI.render(true);
              }
            } else {
              $(image).click();
            }
          });
        });
    });
  });
}
