import settings from "./settings/index.js";
import registerSheets from "./setup/registerSheets.js";
import loadTemplates from "./setup/loadTemplates.js";

import onActorCreate from "./hooks/onActorCreate.js";

const setup = async () => {
  settings();
  registerSheets();
  await loadTemplates();

  Hooks.on("createActor", onActorCreate);
};

export default setup;
