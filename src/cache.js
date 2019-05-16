import { logger } from "./logger.js";

const CACHE_CONFIG = {
  CACHE_NAME: "rise-data-weather",
  CACHE_DURATION: 1000 * 60 * 60 * 2,
};

export function cache( superClass ) {
  return class extends logger( superClass ) {
    constructor() {
      super();

      this._deleteExpiredCache();
    }

    _getCache() {
      if ( caches && caches.open ) {
        return caches.open( CACHE_CONFIG.CACHE_NAME );
      } else {
        super.log( "warning", "cache API not available" );

        return Promise.reject();
      }
    }

    _deleteExpiredCache() {
      this._getCache().then( cache => {
        cache.keys().then( keys => {
          keys.forEach( key => {
            cache.match( key ).then( response => {
              const date = new Date( response.headers.get( "date" ));

              if ( Date.now() > date.getTime() + CACHE_CONFIG.CACHE_DURATION ) {
                cache.delete( key );
              }
            });
          });
        });
      });
    }

    putCache( res ) {
      this._getCache().then( cache => {
        return cache.put( res.url, res );
      }).catch( err => {
        super.log( "warning", "cache put failed", { url: res.url }, err );
      });
    }

    getCache( url ) {
      var _cache;

      return this._getCache().then( cache => {
        _cache = cache;
        return cache.match( url );
      }).then( response => {
        if ( response ) {
          super.log( "info", "found in cache", { url: url });

          const date = new Date( response.headers.get( "date" ));

          if ( Date.now() < date.getTime() + CACHE_CONFIG.CACHE_DURATION ) {
            return Promise.resolve( response );

          } else {
            super.log( "info", "removing old cache entry", { url: url });
            _cache.delete( url );

            return Promise.reject();
          }
        } else {
          super.log( "info", "not cached", { url: url });

          return Promise.reject();
        }
      });
    }
  }
}
