import checkCoreAvailability from "./config/checkCoreAvailability.js";
import setup from "./modules/setup.js";

Hooks.once("ready", async () => {
  // we are doing a delayed start in order to wait for vtta-core to register everything
  // setTimeout(async () => {
  CONFIG.debug.hooks = false;

  try {
    const coreVersionNumber = await checkCoreAvailability();
    await setup();

    const autoOpen = () => {
      const actorName = "Curth";
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
  } catch (error) {
    console.log(error);
    const core = game.modules.get("vtta-core");
    const coreMissing = core === undefined;
    const coreDisabled = core && core.active === false;

    if (coreMissing) {
      ui.notifications.error(game.i18n.localize(`ERROR.CoreMissing`), {
        permanent: true,
      });
    }

    if (coreDisabled) {
      ui.notifications.error(game.i18n.localize(`ERROR.CoreDisabled`), {
        permanent: true,
      });
    }
  }
});
