/* eslint-disable no-console */

import { PolymerElement, html } from "@polymer/polymer";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { weatherServerConfig } from "./rise-data-weather-config.js";
import { version } from "./rise-data-weather-version.js";
import "@polymer/iron-jsonp-library/iron-jsonp-library.js";

class RiseDataWeather extends PolymerElement {

  static get template() {
    return html`
      <iron-jsonp-library
            id="weather"
            notify-event="weather-data"
            library-error-message="{{weatherErrorMessage}}">
        </iron-jsonp-library>
    `;
  }

  static get properties() {
    return {
      /**
       * Unit of temperature that should be used.
       * Valid values are: F, C.
       */
      temperatureUnit: {
        type: String,
        value: "F"
      },

      /**
       * Interval for which data should be retrieved.
       * Valid values are: 48h, 7d, 15d.
       */
      duration: {
        type: String,
        value: "7d"
      },

      /**
       * The address of the display running this instance of the component.
       */
      displayAddress: {
        type: Object,
        readOnly: true,
        value: {}
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

  // Each item of observers array is a method name followed by
  // a comma-separated list of one or more dependencies.
  static get observers() {
    return [
      "_reset(symbols, instrumentFields)",
      "_handleError(weatherErrorMessage)"
    ]
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

  constructor() {
    super();

    this._refreshDebounceJob = null;
    this._initialStart = true;
    this._logDataUpdate = true;
    this._weatherRequestRetryCount = 0;
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
    const display_id = RisePlayerConfiguration.getDisplayId();

    if ( display_id && typeof display_id === "string" && display_id !== "DISPLAY_ID" ) {
      this._setDisplayId( display_id );
    }

    this.addEventListener( RiseDataWeather.EVENT_START, this._handleStart, { once: true });

    this._sendWeatherEvent( RiseDataWeather.EVENT_CONFIGURED );
  }

  connectedCallback() {
    super.connectedCallback();

    this._handleData = this._handleData.bind( this );
    this.$.weather.addEventListener( "weather-data", this._handleData );
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.$.weather.removeEventListener( "weather-data", this._handleData );
  }

  _getComponentData() {
    return {
      name: "rise-data-weather",
      id: this.id,
      version: version
    };
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

  _reset() {
    if ( !this._initialStart ) {
      this._logDataUpdate = true;
      this._refreshDebounceJob && this._refreshDebounceJob.cancel();

      this._log( "info", "reset", {
        symbols: this.symbols,
        instrumentFields: this.instrumentFields
      });

      this._getData( this.symbols,
        {
          type: this.type,
          duration: this.duration,
        },
        this.instrumentFields
      );
    }
  }

  _sendWeatherEvent( eventName, detail = {}) {
    const event = new CustomEvent( eventName, {
      bubbles: true, composed: true, detail
    });

    this.dispatchEvent( event );
  }

  _isValidDuration( duration ) {
    // Choose which duration to query the Weather server with.
    return [ "48h", "7d", "15d" ].indexOf( duration ) !== -1;
  }

  _handleError() {
    if ( !this._initialStart && this.weatherErrorMessage ) {
      if ( this._weatherRequestRetryCount < 5 ) {
        this._weatherRequestRetryCount += 1;

        // need to reset to null otherwise weatherErrorMessage value may not change from next request failure
        // and therefore observer won't trigger this handler
        this.weatherErrorMessage = null;

        timeOut.run(() => {
          this._getData( this.symbols,
            {
              type: this.type,
              duration: this.duration
            },
            this.instrumentFields
          );
        }, 1000 );
      } else {
        this._weatherRequestRetryCount = 0;
        this._log( "error", RiseDataWeather.EVENT_REQUEST_ERROR, { message: this.weatherErrorMessage });
        this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR, { message: this.weatherErrorMessage });
        this._refresh();
      }
    }
  }

  _handleData( event ) {
    if ( !event.detail || !event.detail.length ) {
      return;
    }

    const detail = event.detail [ 0 ];

    this._weatherRequestRetryCount = 0;

    if ( detail.hasOwnProperty( "errors" ) && detail.errors.length === 1 ) {
      this._log( "error", RiseDataWeather.EVENT_DATA_ERROR, { error: detail.errors[ 0 ] });
      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_ERROR, detail.errors[ 0 ]);
    } else {
      let data = {};

      if ( detail.hasOwnProperty( "table" ) && detail.table ) {
        data.data = detail.table;
      }

      if ( this._logDataUpdate ) {
        // due to refresh every 60 seconds, prevent logging data-update event to BQ every time
        this._logDataUpdate = false;

        this._log( "info", RiseDataWeather.EVENT_DATA_UPDATE, data );
      }

      this._checkWeatherErrors( data );

      this._sendWeatherEvent( RiseDataWeather.EVENT_DATA_UPDATE, data );
    }

    this._refresh();
  }

  _checkWeatherErrors( data ) {
    // TODO: Implement weather error catching
  }

  _getQueryString( fields ) {
    if ( fields.length === 0 ) {
      return "";
    }

    return `select ${ fields.join( "," ) }`;
  }

  _getParams( fields, symbols, callback ) {

    return Object.assign({},
      {
        id: this.displayId,
        code: symbols,
        tqx: `out:json;responseHandler:${callback}`
      },
      fields.length > 0 ? { tq: this._getQueryString( fields ) } : null );
  }

  _getKey() {
    return `risedataweather_${this.type}_${this.displayId}_${this.symbols}_${this.duration}`;
  }

  _getCallbackValue( key ) {
    return ( btoa(( this.id ? this.id : "" ) + key )).substr( 0, 10 ) + ( Math.random().toString()).substring( 2 );
  }

  _getSerializedUrl( url, params ) {
    const queryParams = Object.keys( params ).reduce(( arr, key ) => {
      return arr.push( key + "=" + encodeURIComponent( params[ key ])) && arr;
    }, []).join( "&" );

    return `${url}?${queryParams}`;
  }

  _getData( symbols, props, fields ) {
    if ( !this._isValidDuration( props.duration )) {
      return;
    }

    // set callback with the same value it was set on the responseHandler of the tqx parameter
    const weather = this.$.weather,
      callbackValue = this._getCallbackValue( this._getKey());

    let params = this._getParams( fields, symbols, callbackValue ),
      url;

    if ( props.type === "realtime" ) {
      url = this._getSerializedUrl( weatherServerConfig.realTimeURL, params );
    } else {
      params.kind = props.duration;
      url = this._getSerializedUrl( weatherServerConfig.historicalURL, params );
    }

    weather.callbackName = callbackValue;
    weather.libraryUrl = url;
  }

  _refresh() {
    if ( !this._refreshDebounceJob || !this._refreshDebounceJob.isActive()) {
      this._refreshDebounceJob = Debouncer.debounce( this._refreshDebounceJob, timeOut.after( 60000 ), () => {
        this._getData( this.symbols,
          {
            type: this.type,
            duration: this.duration,
          },
          this.instrumentFields
        );
      });
    }
  }

  _handleStart() {
    if ( this._initialStart ) {
      this._initialStart = false;

      // configure and execute request
      this._getData( this.symbols,
        {
          type: this.type,
          duration: this.duration,
        },
        this.instrumentFields
      );
    }
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
