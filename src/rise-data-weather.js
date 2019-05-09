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
    return "rise-data-weather";
  }

  static get CACHE_DURATION() {
    return 1000 * 60 * 60 * 2;
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
    if ( !displayAddress ) {
      return "";
    }

    let resp = [];

    if ( displayAddress.city ) {
      resp.push( displayAddress.city );
    }
    if ( displayAddress.province ) {
      resp.push( displayAddress.province );
    }
    if ( displayAddress.country ) {
      resp.push( displayAddress.country );
    }

    return resp.join( "," );
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
    this._deleteExpiredCache();

    const display_id = RisePlayerConfiguration.getDisplayId();

    if ( display_id && typeof display_id === "string" && display_id !== "DISPLAY_ID" ) {
      this._setDisplayId( display_id );
    }

    this.addEventListener( RiseDataWeather.EVENT_START, this._handleStart, { once: true });

    this._sendWeatherEvent( RiseDataWeather.EVENT_CONFIGURED );
  }

  _deleteExpiredCache() {
    this._getCache().then( cache => {
      cache.keys().then( keys => {
        keys.forEach( key => {
          cache.match( key ).then( response => {
            const date = new Date( response.headers.get( "date" ));

            if ( Date.now() > date.getTime() + RiseDataWeather.CACHE_DURATION ) {
              cache.delete( key );
            }
          });
        });
      });
    });
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
      headers: { "X-Requested-With": "rise-data-weather" }
    }).then( res => {
      return this._getCache().then( cache => {
        this._handleResponse( res.clone());
        return cache.put( res.url, res );
      })
    }).catch( this._handleFetchError.bind( this ));
  }

  _handleStart() {
    let url = this._getUrl();

    this._getCache().then( cache => {
      cache.match( url ).then( response => {
        if ( response ) {
          this._log( "info", "found in cache", { url: url });

          const date = new Date( response.headers.get( "date" ));

          if ( Date.now() < date.getTime() + RiseDataWeather.CACHE_DURATION ) {
            response.text().then( str => {
              this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, "CACHED::" + this._processData( str ));
            });

          } else {
            this._log( "info", "removing old cache entry", { url: url });
            cache.delete( url );

            this._requestData();
          }
        } else {
          this._log( "info", "not cached", { url: url });
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

  _handleFetchError() {
    this._log( "error", "request error" );
    this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR );
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
