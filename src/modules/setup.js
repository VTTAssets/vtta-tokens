import settings from "./settings/index.js";
import registerSheets from "./setup/registerSheets.js";
import loadTemplates from "./setup/loadTemplates.js";

const setup = async () => {
  settings();
  registerSheets();
  await loadTemplates();
};

export default setup;
