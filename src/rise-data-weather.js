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
      }

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

}

customElements.define( "rise-data-weather", RiseDataWeather );
