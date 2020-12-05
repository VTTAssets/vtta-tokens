const prerequisites = () => {
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

  return !(coreMissing || coreDisabled);
};

export default prerequisites;
