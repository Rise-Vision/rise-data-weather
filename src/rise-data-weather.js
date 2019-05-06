/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";

import { weatherServerConfig } from "./rise-data-weather-config.js";
import { version } from "./rise-data-weather-version.js";

class RiseDataWeather extends PolymerElement {

  static get properties() {
    return {
      /**
       * Unit of temperature that should be used.
       * Valid values are: F, C.
       */
      scale: {
        type: String,
        value: "F"
      },

      /**
       * The address of the display running this instance of the component.
       */
      displayAddress: {
        type: Object,
        readOnly: true,
        value: {
          city: "Toronto",
          province: "ON",
          country: "CA"
        }
      },

      /**
      * The full display address in a single string.
      */
      fullAddress: {
        type: String,
        computed: "_computeFullAddress(displayAddress)"
      },

      /**
       * The id of the display running this instance of the component.
       */
      displayId: {
        type: String,
        readOnly: true,
        value: "preview"
      }
    }
  }

  static get CACHE_NAME() {
    return "rise-data-weather"
  }

  // Event name constants
  static get EVENT_CONFIGURED() {
    return "configured";
  }
  static get EVENT_START() {
    return "start";
  }
  static get EVENT_DATA_UPDATE() {
    return "data-update";
  }
  static get EVENT_DATA_ERROR() {
    return "data-error";
  }
  static get EVENT_REQUEST_ERROR() {
    return "request-error";
  }

  _computeFullAddress( displayAddress ) {
    return [ displayAddress.city, displayAddress.province, displayAddress.country ].join( "," )
  }

  constructor() {
    super();
  }

  ready() {
    super.ready();

    if ( RisePlayerConfiguration.isConfigured()) {
      this._init();
    } else {
      const init = () => this._init();

      window.addEventListener( "rise-components-ready", init, { once: true });
    }
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  _init() {
    const display_id = RisePlayerConfiguration.getDisplayId();

    if ( display_id && typeof display_id === "string" && display_id !== "DISPLAY_ID" ) {
      this._setDisplayId( display_id );
    }

    this.addEventListener( RiseDataWeather.EVENT_START, this._handleStart, { once: true });

    this._sendWeatherEvent( RiseDataWeather.EVENT_CONFIGURED );
  }

  _getComponentData() {
    return {
      name: "rise-data-weather",
      id: this.id,
      version: version
    };
  }

  _getCache() {
    return caches.open( RiseDataWeather.CACHE_NAME );
  }

  _getUrl() {
    let url = weatherServerConfig.providerURL;

    if ( this.scale == "C" ) {
      url += "&metric=true";
    }
    url += "&name=" + encodeURIComponent( this.fullAddress );

    return url;
  }

  _log( type, event, details = null, additionalFields ) {
    const componentData = this._getComponentData();

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

  _sendWeatherEvent( eventName, detail = {}) {
    const event = new CustomEvent( eventName, {
      bubbles: true, composed: true, detail
    });

    this.dispatchEvent( event );
  }

  _requestData() {
    fetch( this._getUrl(), {
      headers: {
        "X-Requested-With": "rise-data-weather"
      }
    }).then( res => {
      return this._getCache().then( cache => {
        this._handleResponse( res.clone());
        return cache.put( res.url, res );
      })
    });
  }

  _handleStart() {
    this._getCache().then( cache => {
      cache.match( this._getUrl())
        .then( response => {
          if ( response ) {
            this._log( "info", "cached", {});
            response.text().then( str => {
              this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, "CACHED::" + this._processData( str ));
            })
          } else {
            this._log( "info", "not cached" );
            this._requestData();
          }
        });
    });
  }

  _processData( body ) {
    let parser = new DOMParser(),
      xmlDoc = parser.parseFromString( body, "text/xml" ),
      element = xmlDoc.evaluate(
        "//observation[1]",
        xmlDoc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null ).singleNodeValue;

    return element.getAttribute( "temperature" )
  }

  _handleResponse( resp ) {
    this._log( "info", "response received", { response: resp.body });

    resp.text().then( str => {
      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, this._processData( str ));
    });
  }

  _handleResponseError( event, request ) {
    this._log( "error", "error response", { response: request.response });
    this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR );
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
