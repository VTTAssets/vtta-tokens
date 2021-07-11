const config = {
  module: {
    name: "vtta-tokens",
    label: "VTTA Tokens",
  },
  startupDelay: 2000,
  sheets: {
    profileImageClasses: [
      ".profile",
      ".sheet-profile",
      ".profile-img",
      ".player-image",
    ],
  },
  editor: {
    tokenSize: {
      default: 400,
      min: 100,
      max: 800,
    },
  },
  templates: {
    partials: {
      ADD_LAYER_LOCAL:
        "modules/vtta-tokens/src/templates/partials/add-layer-local.hbs",
      ADD_LAYER_REMOTE:
        "modules/vtta-tokens/src/templates/partials/add-layer-remote.hbs",
    },
  },
  messaging: {
    core: {
      query: "vtta-core.query",
      response: "vtta-core.available",
      timeout: 100,
      retries: 20,
    },
  },
};

export default config;
