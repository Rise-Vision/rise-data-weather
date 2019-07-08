/* eslint-disable no-console */

import { RiseElement } from "rise-common-component/src/rise-element.js";
import { CacheMixin } from "rise-common-component/src/cache-mixin.js";
import { FetchMixin } from "rise-common-component/src/fetch-mixin.js";

import { weatherServerConfig } from "./rise-data-weather-config.js";
import { version } from "./rise-data-weather-version.js";
import { parseTinbu } from "./tinbu-parser.js";

const fetchBase = CacheMixin( RiseElement );

class RiseDataWeather extends FetchMixin( fetchBase ) {

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

  // Event name constants
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

    this._setVersion( version );
  }

  ready() {
    super.ready();

    super.initFetch({}, this._handleResponse, this._handleError );
    super.initCache({
      name: this.tagName.toLowerCase()
    });
  }

  _init() {
    super._init();
  }

  _getUrl() {
    let url = weatherServerConfig.providerURL;

    if ( this.scale == "C" ) {
      url += "&metric=true";
    }
    url += "&name=" + encodeURIComponent( this.fullAddress );

    return url;
  }

  _processWeatherData( content ) {
    var data;

    try {
      data = parseTinbu( content );

      this._setWeatherData( data );

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, this.weatherData );
    } catch ( e ) {
      super.log( "error", "data error", { error: e.message });

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, e );
    }
  }

  _handleStart() {
    super._handleStart();

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

      super.fetch( this._getUrl(), {
        headers: { "X-Requested-With": "rise-data-weather" }
      });
    } else {
      super.log( "error", message, this.displayAddress );

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, message );
    }
  }

  _handleResponse( resp ) {
    resp.text().then( this._processWeatherData.bind( this ));
  }

  _handleError() {
    this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR );
  }

  _sendWeatherEvent( name, detail ) {
    this._sendEvent( name, detail );

    switch ( name ) {
    case RiseDataWeather.EVENT_REQUEST_ERROR:
    case RiseDataWeather.EVENT_DATA_ERROR:
      this._setUptimeError( true );
      break;
    case RiseDataWeather.EVENT_DATA_UPDATE:
      this._setUptimeError( false );
      break;
    default:
    }
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
