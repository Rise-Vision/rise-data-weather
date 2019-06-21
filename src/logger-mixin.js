import { dedupingMixin } from "../node_modules/@polymer/polymer/lib/utils/mixin.js";

export const LoggerMixin = dedupingMixin( base => {
  const LOGGER_CONFIG = {
    name: "logger-mixin",
    id: "logger",
    version: "1.0"
  };

  class Logger extends base {

    constructor() {
      super();

      this.loggerConfig = Object.assign({}, LOGGER_CONFIG );
    }

    initLogger( loggerConfig ) {
      Object.assign( this.loggerConfig, loggerConfig );
    }

    log( type, event, details = null, additionalFields ) {
      switch ( type ) {
      case "info":
        RisePlayerConfiguration.Logger.info( this.loggerConfig, event, details, additionalFields );
        break;
      case "warning":
        RisePlayerConfiguration.Logger.warning( this.loggerConfig, event, details, additionalFields );
        break;
      case "error":
        RisePlayerConfiguration.Logger.error( this.loggerConfig, event, details, additionalFields );
        break;
      }
    }
  }

  return Logger;
})
