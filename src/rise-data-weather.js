/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";

import { weatherServerConfig } from "./rise-data-weather-config.js";
import { CacheMixin } from "./cache-mixin.js";
import { parseTinbu } from "./tinbu-parser.js";

class RiseDataWeather extends CacheMixin( PolymerElement ) {

  static get properties() {
    return {
      /**
       * Unit of temperature that should be used.
       * Valid values are: F, C.
       */
      scale: {
        type: String,
        value: "F",
        observer: "_scaleUpdated"
      },

      /**
       * The address of the display running this instance of the component.
       */
      displayAddress: Object,

      /**
      * The full display address in a single string.
      */
      fullAddress: {
        type: String,
        computed: "_computeFullAddress(displayAddress)",
        observer: "_fullAddressUpdated"
      },

      /**
       * The result of the Weather API.
       */
      weatherData: {
        type: Object,
        readOnly: true
      }
    }
  }

  static get FETCH_CONFIG() {
    return {
      RETRY: 1000 * 60,
      COOLDOWN: 1000 * 60 * 10,
      REFRESH: 1000 * 60 * 60,
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
    } else if ( !( displayAddress.postalCode || ( displayAddress.city && displayAddress.country ))) {
      return "";
    }

    let resp = [];

    if ( displayAddress.city ) {
      resp.push( displayAddress.city );
    }
    if ( displayAddress.province ) {
      resp.push( displayAddress.province );
    }
    if ( displayAddress.postalCode ) {
      resp.push( displayAddress.postalCode );
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
    this._logDataReceived = true;
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

  _init() {
    super.init( this.id );

    this.addEventListener( RiseDataWeather.EVENT_START, this._handleStart, { once: true });

    this._sendWeatherEvent( RiseDataWeather.EVENT_CONFIGURED );
  }

  _getUrl() {
    let url = weatherServerConfig.providerURL;

    if ( this.scale == "C" ) {
      url += "&metric=true";
    }
    url += "&name=" + encodeURIComponent( this.fullAddress );

    return url;
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
      this._logData( false );
      this._handleResponse( res.clone());

      super.putCache( res );
    }).catch( this._handleFetchError.bind( this ));
  }

  _getData() {
    let url = this._getUrl();

    super.getCache( url ).then( response => {
      this._logData( true );
      response.text().then( this._processData.bind( this ));
    }).catch(() => {
      this._requestData();
    });
  }

  _logData( cached ) {
    if ( this._logDataReceived ) {
      this._logDataReceived = false;
      super.log( "info", "data received", { cached });
    }
  }

  _processData( content ) {
    var data;

    try {
      data = parseTinbu( content );

      if ( !( this.weatherData && this.weatherData.reportDate ) || this.weatherData.reportDate.getTime() !== data.reportDate.getTime()) {
        this._setWeatherData( data );

        this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, this.weatherData );
      }
    } catch ( e ) {
      super.log( "error", "data error", { error: e.message });

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, e );
    }

    this._refresh( RiseDataWeather.FETCH_CONFIG.REFRESH );
  }

  _handleStart() {
    super.log( "info", "start received" );

    RisePlayerConfiguration.DisplayData.onDisplayAddress(( displayAddress ) => {
      this.displayAddress = displayAddress;
    });
  }

  _scaleUpdated() {
    if ( this.scale && this.fullAddress ) {
      this._fullAddressUpdated();
    }
  }

  _fullAddressUpdated() {
    var message = "displayAddress is incomplete or missing";

    if ( this.fullAddress ) {
      this._weatherRequestRetryCount = 0;

      this._refresh( 0 );
    } else {
      super.log( "error", message, this.displayAddress );

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, message );
    }
  }

  _handleResponse( resp ) {
    resp.text().then( this._processData.bind( this ));
  }

  _handleFetchError( err ) {
    if ( this._weatherRequestRetryCount < RiseDataWeather.FETCH_CONFIG.COUNT ) {
      this._weatherRequestRetryCount += 1;

      this._refresh( RiseDataWeather.FETCH_CONFIG.RETRY );
    } else {
      this._weatherRequestRetryCount = 0;

      super.log( "error", "request error", { error: err ? err.message : null });
      this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR );

      this._refresh( RiseDataWeather.FETCH_CONFIG.COOLDOWN );
    }
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
