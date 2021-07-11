import config from "./index.js";

const log = (message) => {
  const DEBUG = true;
  if (DEBUG) {
    console.log(
      `%c[INIT] ${config.module.name} %c${message}`,
      "font-weight: bold; background-color: lightblue; color: ##1f1f1f;",
      "font-weight: bold; background-color: lightblue; color: ##1f1f1f;font-weight: normal"
    );
  }
};

const checkCoreAvailability = () => {
  log(`Querying for vtta-core`);

  let responseReceived = false;

  return new Promise((resolve, reject) => {
    const availabilityQueryHandler = (event) => {
      responseReceived = true;

      // remove self from the event listeners
      window.removeEventListener(
        config.messaging.core.response,
        availabilityQueryHandler
      );

      log(`vtta-core v${event.detail.version} found.`);
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

    // query only so many times as configured
    let coreAvailabilityTries = 0;

    // setting up the interval
    const coreQueryInterval = setInterval(() => {
      if (responseReceived) return;

      coreAvailabilityTries++;
      // if we exceed the number of queries, we abort the setup
      if (coreAvailabilityTries > config.messaging.core.retries) {
        clearInterval(coreQueryInterval);
        log(`No answer from vtta-core, aborting start.`);
        reject();
      }

      // dispatch the query event
      log(
        `Querying for vtta-core (attempt ${coreAvailabilityTries}/${config.messaging.core.retries})...`
      );
      window.dispatchEvent(new CustomEvent(config.messaging.core.query));

      // and repeat that for that given timeout
    }, config.messaging.core.timeout * 5);
  });
};

export default checkCoreAvailability;
