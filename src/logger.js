import { version } from "./rise-data-weather-version.js";

var id = null;
const logger = {
  init,
  log
};

function init( componentId ) {
  id = componentId;
}

function getComponentData() {
  return {
    name: "rise-data-weather",
    id,
    version
  };
}

function log( type, event, details = null, additionalFields ) {
  const componentData = getComponentData();

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

export { logger }
