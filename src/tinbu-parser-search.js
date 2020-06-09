
function parseTinbuSearch( body, displayAddress ) {
  try {
    const xmlDoc = new DOMParser().parseFromString( body, "text/xml" );

    return extractLocationId( xmlDoc, displayAddress );

  } catch ( e ) {
    throw new Error( `Invalid search result (${e})` );
  }
}

function extractLocationId( xmlDoc, displayAddress ) {
  const nodes = xmlDoc
    .evaluate( "/cw_citylist/city", xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE );

  let result,
    element,
    bestScore = 0;

  while (( element = nodes.iterateNext()) !== null ) {
    const score = getAddressMatchigScore( element, displayAddress );

    if ( !result || score > bestScore ) {
      bestScore = score;
      result = element.getAttribute( "id" );
    }
  }

  if ( !result ) {
    throw new Error( "city data is missing" );
  }

  return result;
}

function getAddressMatchigScore( element, displayAddress ) {

  let score = 0;

  if ( valuesMatch( displayAddress.country, element.getAttribute( "iso_cc" ))) {
    score += 0b001;
  }

  if ( valuesMatch( displayAddress.province, element.getAttribute( "state" ))) {
    score += 0b010;
  }

  if ( valuesMatch( displayAddress.city, element.getAttribute( "name" ))) {
    //city match gets the highest score
    score += 0b100;
  }

  return score;
}

function valuesMatch( value1, value2 ) {
  return value1 && value2 && value1.trim().toUpperCase() === value2.trim().toUpperCase();
}

export { parseTinbuSearch }
