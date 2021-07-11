import config from "../../config/index.js";
import UI from "./UI.js";

class App extends FormApplication {
  constructor(options, actor) {
    super(options);
    this.actor = actor;

    this.tokenSize = parseInt(
      game.settings.get(config.module.name, "tokenSize")
    );
  }

  /** @override */
  static get defaultOptions() {
    return Object.assign(super.defaultOptions, {
      width: 850,
      resizeable: true,
      height: "auto",
      classes: ["vtta", "ui", "tokens"],
      template: "modules/vtta-tokens/src/templates/ui.handlebars",
    });
  }

  getData() {
    return {};
  }

  async _updateObject(event, formData) {
    event.preventDefault();
    this.close();
  }

  activateListeners(html) {
    const ui = new UI(html);
    ui.loadActor(this.actor);
    super.activateListeners(html);
  }
}

export default App;
