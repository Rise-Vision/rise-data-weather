/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";

import { weatherServerConfig } from "./rise-data-weather-config.js";
import { version } from "./rise-data-weather-version.js";
import { parseTinbu } from "./tinbu-parser.js";

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

  static get API_RETRY() {
    return {
      INTERVAL: 1000 * 60,
      COOLDOWN: 1000 * 60 * 10,
      COUNT: 5
    };
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

    this._weatherRequestRetryCount = 0;
    this._refreshDebounceJob = null;
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
    if ( caches && caches.open ) {
      return caches.open( RiseDataWeather.CACHE_NAME );
    } else {
      this._log( "warning", "cache API not available" );

      return Promise.reject();
    }
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

  _refresh( interval ) {
    this._refreshDebounceJob = Debouncer.debounce( this._refreshDebounceJob, timeOut.after( interval ), () => {
      this._getData();
    });
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

  _getData() {
    let url = this._getUrl();

    this._getCache().then( cache => {
      cache.match( url ).then( response => {
        if ( response ) {
          this._log( "info", "found in cache", { url: url });

          const date = new Date( response.headers.get( "date" ));

          if ( Date.now() < date.getTime() + RiseDataWeather.CACHE_DURATION ) {
            response.text().then( this._processData.bind( this ));

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

  _processData( content ) {
    try {
      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, parseTinbu( content ));

      this._refresh( RiseDataWeather.API_RETRY.COOLDOWN );
    } catch ( e ) {
      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, e );
    }
  }

  _handleStart() {
    RisePlayerConfiguration.DisplayData.onDisplayAddress(( displayAddress ) => {
      this._setDisplayAddress( displayAddress );

      this._refresh( 0 );
    })
  }

  _handleResponse( resp ) {
    // NOTE: resp.body is a blank object
    this._log( "info", "response received", { response: resp.body });

    resp.text().then( this._processData.bind( this ));
  }

  _handleFetchError() {
    if ( this._weatherRequestRetryCount < RiseDataWeather.API_RETRY.COUNT ) {
      this._weatherRequestRetryCount += 1;

      this._refresh( RiseDataWeather.API_RETRY.INTERVAL );
    } else {
      this._weatherRequestRetryCount = 0;

      this._log( "error", "request error" );
      this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR );

      this._refresh( RiseDataWeather.API_RETRY.COOLDOWN );
    }
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
