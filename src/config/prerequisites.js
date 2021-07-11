const checkCoreAvailability = () => {
  return new Promise((resolve, reject) => {
    // query only so many times as configured
    let coreAvailabilityTries = 0;

    // setting up the interval
    const coreQueryInterval = setInterval(() => {
      coreAvailabilityTries++;

      // if we exceed the number of queries, we abort the setup
      if (coreAvailabilityTries > config.messaging.core.retries) {
        clearInterval(coreQueryInterval);
        reject();
      }

      const availabilityQueryHandler = (event) => {
        // remove self from the event listeners
        window.removeEventListener(
          config.messaging.core.response,
          availabilityQueryHandler
        );
        // resolve with the core version number
        resolve({
          version: event.detail.version,
        });
      };

      // add the event listener to the window-object
      window.addEventListener(
        config.messaging.core.response,
        availabilityQueryHandler
      );

      // dispatch the query event
      window.dispatchEvent(new CustomEvent(config.messaging.core.query));

      // do not wait forever for a reply, run into a timeout
      setTimeout(() => {
        window.removeEventListener(
          config.messaging.core.response,
          availabilityQueryHandler
        );
      }, config.messaging.core.timeout);

      // and repeat that for that given timeout
    }, config.messaging.core.timeout);
  });
};

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

export default checkCoreAvailability;
