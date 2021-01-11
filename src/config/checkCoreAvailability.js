import config from "./index.js";

const checkCoreAvailability = () => {
  console.log(`Querying for vtta-core`);

  let responseReceived = false;

  return new Promise((resolve, reject) => {
    const availabilityQueryHandler = (event) => {
      responseReceived = true;

      // remove self from the event listeners
      window.removeEventListener(
        config.messaging.core.response,
        availabilityQueryHandler
      );

      console.info(`vtta-core v${event.detail.version} found.`);
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
      console.info(
        `Querying for vtta-core (${coreAvailabilityTries} attempt)...`
      );

      // if we exceed the number of queries, we abort the setup
      if (coreAvailabilityTries > config.messaging.core.retries) {
        clearInterval(coreQueryInterval);
        console.warn(`No answer from vtta-core, aborting start.`);
        reject();
      }

      // dispatch the query event
      console.log("Dispatching event...");
      window.dispatchEvent(new CustomEvent(config.messaging.core.query));

      // and repeat that for that given timeout
    }, config.messaging.core.timeout * 5);
  });
};

export default checkCoreAvailability;
