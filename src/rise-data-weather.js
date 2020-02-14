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
        value: "F"
      },

      /**
       * The address of the display running this instance of the component.
       */
      displayAddress: {
        type: Object,
        observer: "_computeFullAddress"
      },

      /**
      * The full display address in a single string.
      */
      fullAddress: String,

      /**
       * The result of the Weather API.
       */
      weatherData: {
        type: Object,
        readOnly: true
      }
    }
  }

  constructor() {
    super();

    this._setVersion( version );
  }

  ready() {
    super.ready();

    super.initFetch({
      retry: 1000 * 60,
      cooldown: 1000 * 60 * 10,
      refresh: 1000 * 60 * 30,
      count: 5
    }, this._handleResponse, this._handleError );
    super.initCache({
      name: this.tagName.toLowerCase(),
      expiry: 1000 * 60 * 60 * 2
    });
  }

  _init() {
    super._init();
  }

  _isDevelopmentEnvironment() {
    return !( RisePlayerConfiguration && RisePlayerConfiguration.DisplayData &&
      RisePlayerConfiguration.DisplayData.onDisplayData );
  }

  _isValidAddress( address ) {
    if ( !address ) {
      return false;
    } else if ( !( address.postalCode || ( address.city && address.country ))) {
      return false;
    } else {
      return true;
    }
  }

  _computeFullAddress( displayAddress ) {
    if ( this._isValidAddress( displayAddress )) {
      let resp = [];

      if (( displayAddress.country === "US" || displayAddress.country === "CA" ) && displayAddress.postalCode ) {
        resp.push( displayAddress.postalCode );
        resp.push( displayAddress.country );
      } else {
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
      }

      this.fullAddress = resp.join( "," );
    } else {
      let message = "displayAddress is incomplete or missing";

      super.log( RiseDataWeather.LOG_TYPE_ERROR, message, this.displayAddress );

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, message );

      this.fullAddress = "";
    }
  }

  _onDisplayData( displayData ) {
    if ( displayData ) {
      let isCompanyAddressValid = this._isValidAddress( displayData.companyAddress ),
        isDisplayAddressValid = this._isValidAddress( displayData.displayAddress );

      if (( !displayData.useCompanyAddress || !isCompanyAddressValid ) && isDisplayAddressValid ) {
        this.displayAddress = displayData.displayAddress;

        return;
      } else if ( isCompanyAddressValid ) {
        this.displayAddress = displayData.companyAddress;

        return;
      }
    }

    this.displayAddress = {};
  }

  _handleStart() {
    super._handleStart();

    // Clear full address and reset to trigger observer for the first data retrieval
    // in the development environment
    let fullAddress = this.fullAddress;

    this.fullAddress = "";

    this._createMethodObserver( "_initFetch(fullAddress, scale)" );

    if ( !this._isDevelopmentEnvironment()) {
      RisePlayerConfiguration.DisplayData.onDisplayData( this._onDisplayData.bind( this ));
    } else {
      this.fullAddress = fullAddress;
    }
  }

  _getUrl() {
    let url = weatherServerConfig.providerURL;

    url += "&metric=" + ( this.scale == "C" ? "true" : "false" );
    url += "&name=" + encodeURIComponent( encodeURIComponent( this.fullAddress ));

    return url;
  }

  _processWeatherData( content ) {
    var data;

    try {
      data = parseTinbu( content );

      this._setWeatherData( data );

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, this.weatherData );
    } catch ( e ) {
      super.log( RiseDataWeather.LOG_TYPE_ERROR, "data error", { error: e.message, content: content });

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, e );
    }
  }

  _initFetch() {
    if ( this.scale && this.fullAddress ) {
      this._weatherRequestRetryCount = 0;

      super.fetch( this._getUrl(), {
        headers: { "X-Requested-With": "rise-data-weather" }
      });
    }
  }

  _handleResponse( resp ) {
    resp.text().then( this._processWeatherData.bind( this ));
  }

  _handleError() {
    this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR );
  }

  _sendWeatherEvent( name, detail ) {
    super._sendEvent( name, detail );

    switch ( name ) {
    case RiseDataWeather.EVENT_REQUEST_ERROR:
    case RiseDataWeather.EVENT_DATA_ERROR:
      super._setUptimeError( true );
      break;
    case RiseDataWeather.EVENT_DATA_UPDATE:
      super._setUptimeError( false );
      break;
    default:
    }
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
