/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";

import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { weatherServerConfig } from "./rise-data-weather-config.js";
import { version } from "./rise-data-weather-version.js";
import "@polymer/iron-ajax/iron-ajax.js";

class RiseDataWeather extends PolymerElement {

  // static get template() {
  //   //handle-as=xml doesn't work (https://github.com/PolymerElements/iron-ajax/issues/53)
  //   return html`
  //     <iron-ajax
  //         id="weather"
  //         url=""
  //         headers='{"X-Requested-With": "XMLHttpRequest"}'
  //         handle-as="document"
  //         on-response="_handleResponse"
  //         on-error="_handleResponseError"
  //         verbose="true">
  //     </iron-ajax>
  //   `;
  // }

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

  _computeFullAddress( displayAddress ) {
    return [ displayAddress.city, displayAddress.province, displayAddress.country ].join( "," )
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
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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

  _checkWeatherErrors() {
    // TODO: Implement weather error catching
  }

  _getUrl() {
    let url = weatherServerConfig.providerURL;

    if ( this.scale == "C" ) {
      url += "&metric=true";
    }
    url += "&name=" + encodeURIComponent( this.fullAddress );
    return url;
  }

  _getData() {
    // const weather = this.$.weather;
    // weather.url = this._getUrl();
    // weather.generateRequest();
    fetch( this._getUrl(), {
      headers: {
        "X-Requested-With": "rise-data-weather"
      }
    }).then( res => {
      return this._getCache().then( cache => {
        this._handleResponse( res.clone());
        return cache.put( res.url, res )
      })
    })

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

  _getCache() {
    return caches.open( "rise-data-weather" );
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
            this._getData();
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
    })

  }

  _handleResponseError( event, request ) {
    this._log( "error", "error response", { response: request.response });
    this._sendWeatherEvent( RiseDataWeather.EVENT_REQUEST_ERROR );
  }

}

customElements.define( "rise-data-weather", RiseDataWeather );
