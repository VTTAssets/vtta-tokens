import config from "./config/index.js";
import prerequisites from "./config/prerequisites.js";
import setup from "./modules/setup.js";

Hooks.once("init", () => {
  // we are doing a delayed start in order to wait for vtta-core to register everything
  setTimeout(async () => {
    CONFIG.debug.hooks = false;

    // if we met all prerequisites, we can continue setting up the module and
    // actually enabling the functionality
    if (prerequisites()) {
      await setup();
      const autoOpen = () => {
        const actorName = "dasd";
        const actor = game.actors.entities.find((a) => a.name === actorName);
        if (!actor) return;
        const sheet = new CONFIG.Actor.sheetClasses.character[
          "dnd5e.ActorSheet5eCharacter"
        ].cls(actor);
        sheet.render(true);
      };

      setTimeout(() => {
        console.log("Opening the actors");
        autoOpen();
      }, 1000);
    }
  }, config.startupDelay);
});

Hooks.once("ready", function () {});
