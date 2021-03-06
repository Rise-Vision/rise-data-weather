const observationFields = [
    "city", "city_name", "location", "latitude", "longitude", "state", "state_name", "country",
    "iso_cc", "country_name", "daylight", "sky_desc", "sky", "precip_desc", "precip", "temp_desc",
    "temp", "air_desc", "air", "description", "temperature", "temperature_scale", "wind_speed",
    "wind_dir", "wind_short", "wind_long", "humidity", "dew_point", "comfort", "baro_pressure",
    "baro_tendency", "barometer", "visibility", "icon", "icon_name", "iso8601"
  ],

  locationFields = [
    "city", "city_name", "latitude", "longitude", "location", "state", "state_name", "country",
    "iso_cc", "country_name"
  ],

  forecastFields = [
    "day_sequence", "day_of_week", "weekday", "daylight", "date", "iso8601", "high_temp",
    "low_temp", "temperature_scale", "sky_desc", "sky", "precip_desc", "precip", "temp_desc", "temp",
    "air_desc", "air", "description", "uv_index", "uv", "wind_speed", "wind_dir", "wind_short",
    "wind_long", "humidity", "dew_point", "comfort", "rainfall", "snowfall", "precip_prob", "icon",
    "icon_name", "beaufort", "beaufort_desc", "baro_pressure"
  ];

function parseTinbu( body ) {
  try {
    const xmlDoc = new DOMParser().parseFromString( body, "text/xml" ),

      report = validateData( body, xmlDoc ),

      isMetric = report.getAttribute( "metric" ) === "true",

      location = extractLocation( xmlDoc, isMetric ),

      observation = extractObservation( xmlDoc, isMetric, location.latitude, location.longitude )

    return { location, observation };
  } catch ( e ) {
    throw new Error( `Invalid weather report (${e})` );
  }
}

function validateData( body, xmlDoc ) {
  const report = xmlDoc
    .evaluate( "/report", xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE )
    .singleNodeValue;

  if ( report === null ) {
    //report data not found, checking for error type/details
    if ( body === "Wrong Passcode." ) {
      throw new Error( "Wrong Passcode" );
    }
    const error = xmlDoc
      .evaluate( "/cw_report/cw_error", xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE )
      .singleNodeValue;

    if ( error !== null ) {
      throw new Error( error.textContent );
    } else {
      throw new Error( "Report data is missing" );
    }
  }
  return report;
}

function extractObservation( xmlDoc, isMetric, locationLatitude, locationLongitude ) {

  const nodes = xmlDoc
      .evaluate( "/report/observation",
        xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE ),
    result = {};
  let nodeElement,
    observation,
    distance,
    minDistance = Number.MAX_SAFE_INTEGER;

  // Find an observation tag that has an icon_name other than 'cw_no_report_icon'
  // source: https://www.geodatasource.com/developers/javascript
  while (( nodeElement = nodes.iterateNext()) !== null ) {
    if ( nodeElement.getAttribute( "icon_name" ) !== "cw_no_report_icon" ) {

      distance = getDistance( locationLatitude, locationLongitude,
        nodeElement.getAttribute( "latitude" ), nodeElement.getAttribute( "longitude" ));

      if ( minDistance > distance ) {
        minDistance = distance;
        observation = nodeElement;
      }
    }
  }

  // Use first observation if can't find a better one
  if ( observation === undefined ) {
    observation = xmlDoc
      .evaluate( "/report/observation",
        xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE )
      .singleNodeValue;
  }
  if ( observation === null ) {
    throw new Error( "Observation data is missing" );
  }

  observationFields.forEach( field => {
    result[ field ] = observation.getAttribute( field );
  });
  result.temperature_scale = isMetric ? "C" : "F";

  return result;
}

//distane is calculated in statute miles (1 mile = 1.609344 km)
function getDistance( lat1, lon1, lat2, lon2 ) {
  if (( lat1 == lat2 ) && ( lon1 == lon2 )) {
    return 0;
  } else {
    const radlat1 = Math.PI * lat1 / 180,
      radlat2 = Math.PI * lat2 / 180,
      theta = lon1 - lon2,
      radtheta = Math.PI * theta / 180;
    let dist = Math.sin( radlat1 ) * Math.sin( radlat2 ) + Math.cos( radlat1 ) * Math.cos( radlat2 ) * Math.cos( radtheta );

    if ( dist > 1 ) {
      dist = 1;
    }

    dist = Math.acos( dist );
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;

    return dist;
  }
}

function extractLocation( xmlDoc, isMetric ) {
  const element = xmlDoc
      .evaluate( "/report/location", xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE )
      .singleNodeValue,

    result = {};

  if ( element === null ) {
    throw new Error( "Location data is missing" );
  }

  locationFields.forEach( field => {
    result[ field ] = element.getAttribute( field );
  });
  result.forecasts = extractForecasts( xmlDoc, isMetric );

  return result;
}

function extractForecasts( xmlDoc, isMetric ) {
  const nodes = xmlDoc
      .evaluate( "/report/location/forecast", xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE ),

    result = [];
  let element;

  while (( element = nodes.iterateNext()) !== null ) {
    const forecast = {};

    forecastFields.forEach( field => {
      forecast[ field ] = element.getAttribute( field );
    });
    forecast.temperature_scale = isMetric ? "C" : "F";

    result.push( forecast );
  }

  return result;
}


export { parseTinbu }
