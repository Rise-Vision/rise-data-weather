import { logger } from "./logger.js";

const CACHE_CONFIG = {
    CACHE_NAME: "rise-data-weather",
    CACHE_DURATION: 1000 * 60 * 60 * 2,
  },
  cache = {
    put,
    get
  };

function getCache() {
  if ( caches && caches.open ) {
    return caches.open( CACHE_CONFIG.CACHE_NAME );
  } else {
    logger.log( "warning", "cache API not available" );

    return Promise.reject();
  }
}

function deleteExpiredCache() {
  getCache().then( cache => {
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

function put( res ) {
  return getCache().then( cache => {
    return cache.put( res.url, res );
  })
}

function get( url ) {
  var _cache;
  return getCache().then( cache => {
    _cache = cache;
    return cache.match( url );
  }).then( response => {
    if ( response ) {
      logger.log( "info", "found in cache", { url: url });

      const date = new Date( response.headers.get( "date" ));

      if ( Date.now() < date.getTime() + CACHE_CONFIG.CACHE_DURATION ) {
        return Promise.resolve( response );

      } else {
        logger.log( "info", "removing old cache entry", { url: url });
        _cache.delete( url );

        return Promise.reject();
      }
    } else {
      logger.log( "info", "not cached", { url: url });

      return Promise.reject();
    }
  });
}

deleteExpiredCache();

export { cache }
