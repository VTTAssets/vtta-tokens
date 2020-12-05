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
        "modules/vtta-tokens/src/templates/partials/add-layer-local.handlebars",
    },
  },
};

export default config;
