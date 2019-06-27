import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { dedupingMixin } from "../node_modules/@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "rise-common-component/src/logger-mixin.js";

export const FetchMixin = dedupingMixin( base => {
  const FETCH_CONFIG = {
      RETRY: 1000 * 60,
      COOLDOWN: 1000 * 60 * 10,
      REFRESH: 1000 * 60 * 60,
      COUNT: 5
    },
    fetchBase = LoggerMixin( base );

  class Fetch extends fetchBase {

    constructor() {
      super();

      this.fetchConfig = Object.assign({}, FETCH_CONFIG );

      this._url = null;
      this._requestRetryCount = 0;
      this._refreshDebounceJob = null;
      this._logDataReceived = true;
    }

    initFetch( fetchConfig, processData, processError ) {
      Object.assign( this.fetchConfig, fetchConfig );

      this.processData = processData;
      this.processError = processError;
    }

    fetch( url ) {
      if ( !url ) {
        return;
      }

      this._url = url;
      this._requestRetryCount = 0;

      this._refresh( 0 );
    }

    _refresh( interval ) {
      this._refreshDebounceJob = Debouncer.debounce( this._refreshDebounceJob, timeOut.after( interval ), () => {
        this._getData();
      });
    }

    _getData() {
      return super.getCache( this._url ).then( resp => {
        this._logData( true );

        this._processData( resp );
      }).catch(() => {
        this._requestData();
      });
    }

    _requestData() {
      return fetch( this._url, {
        headers: { "X-Requested-With": "rise-data-weather" }
      }).then( resp => {
        this._logData( false );
        this._processData( resp.clone());

        super.putCache && super.putCache( resp );
      }).catch( this._handleFetchError.bind( this ));
    }

    _processData( resp ) {
      this.processData && this.processData( resp );

      this._refresh( FETCH_CONFIG.REFRESH );
    }

    _logData( cached ) {
      if ( this._logDataReceived ) {
        this._logDataReceived = false;
        super.log( "info", "data received", { cached });
      }
    }

    _handleFetchError( err ) {
      if ( this._requestRetryCount < FETCH_CONFIG.COUNT ) {
        this._requestRetryCount += 1;

        this._refresh( FETCH_CONFIG.RETRY );
      } else {
        this._requestRetryCount = 0;

        super.log( "error", "request error", { error: err ? err.message : null });

        this.processError && this.processError();

        this._refresh( FETCH_CONFIG.COOLDOWN );
      }
    }

  }

  return Fetch;
})
