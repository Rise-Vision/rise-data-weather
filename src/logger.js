import { version } from "./rise-data-weather-version.js";

export function logger( superClass ) {
  return class extends superClass {
    constructor() {
      super();
    }

    init( id ) {
      this.id = id;
    }

    getComponentData() {
      return {
        name: "rise-data-weather",
        id: this.id,
        version
      };
    }

    log( type, event, details = null, additionalFields ) {
      const componentData = this.getComponentData();

      switch ( type ) {
      case "info":
        RisePlayerConfiguration.Logger.info( componentData, event, details, additionalFields );
        break;
      case "warning":
        RisePlayerConfiguration.Logger.warning( componentData, event, details, additionalFields );
        break;
      case "error":
        RisePlayerConfiguration.Logger.error( componentData, event, details, additionalFields );
        break;
      }
    }
  }
}
