import { dedupingMixin } from "../node_modules/@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin.js";

export const CacheMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
      name: "cache-mixin",
      duration: 1000 * 60 * 60 * 2,
    },
    cacheBase = LoggerMixin( base );

  class Cache extends cacheBase {
    constructor() {
      super();

      this.cacheConfig = Object.assign({}, CACHE_CONFIG );
    }

    initCache( cacheConfig ) {
      Object.assign( this.cacheConfig, cacheConfig );

      this._deleteExpiredCache();
    }

    _getCache() {
      if ( window.caches && window.caches.open ) {
        return caches.open( this.cacheConfig.name );
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

              if ( Date.now() > date.getTime() + this.cacheConfig.duration ) {
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
          const date = new Date( response.headers.get( "date" ));

          if ( Date.now() < date.getTime() + this.cacheConfig.duration ) {
            return Promise.resolve( response );

          } else {
            _cache.delete( url );

            return Promise.reject();
          }
        } else {
          return Promise.reject();
        }
      });
    }
  }

  return Cache;
})
