import checkCoreAvailability from "./config/checkCoreAvailability.js";
import setup from "./modules/setup.js";
// import autoCreate from "./modules/autocreate/index.js";

Hooks.once("ready", async () => {
  try {
    const coreVersionNumber = await checkCoreAvailability();
    await setup();
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

  // window.addEventListener("vtta-ddb.create-token", autoCreate);
});
