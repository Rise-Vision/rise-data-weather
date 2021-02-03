# Weather Data Web Component [![CircleCI](https://circleci.com/gh/Rise-Vision/rise-data-weather/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/workflows/rise-data-weather/tree/master) [![Coverage Status](https://coveralls.io/repos/github/Rise-Vision/rise-data-weather/badge.svg?branch=master)](https://coveralls.io/github/Rise-Vision/rise-data-weather?branch=master)

## Introduction

`rise-data-weather` is a Polymer 3 Web Component that retrieves licensed Weather data.

Instructions for demo page here:
https://github.com/Rise-Vision/rise-data-weather/blob/master/demo/README.md

## Usage

The below illustrates simple usage of the component and listening to the `rise-components-ready` event to initiate. This is required in order to know that the component has been imported to the page. See the demo section in this repo for a full working example of an HTML page using the component which will illustrate required imports in the `<head>` of the page.

### Example

```
  <body>
    <script>
      function configureComponents( evt ) {
        const start = new CustomEvent( "start" ),
        	weather01 = document.querySelector('#rise-data-weather-01');

      	weather01.addEventListener( "data-update", ( evt ) => {
        	console.log( "data update", JSON.stringify(evt.detail) );
      	} );

      	weather01.addEventListener( "data-error", ( evt ) => {
        	console.log( "data error", evt.detail );
      	} );

      	weather01.addEventListener( "request-error", ( evt ) => {
        	console.log( "request error", evt.detail );
      	} );

      	// Start the component once it's configured, but if it's already
      	// configured the listener won't work, so we directly send the
      	// request also.
      	weather01.addEventListener('configured', () =>
        	weather01.dispatchEvent( new CustomEvent( "start" ) )
      	);

      	weather01.dispatchEvent( new CustomEvent( "start" ) );
      }

      window.addEventListener( "rise-components-ready", configureComponents);
    </script>

    <rise-data-weather
      id="weather01"
      label="Weather"
      scale="C"
    </rise-data-weather>
...

  </body>
```

### Data Object

When listening for the "data-update" event, the `event.detail` object returned is an object of the following format:

```
{
   "observation":
    {
       "city": "CYTZ",
       "city_name": "Toronto Island Airport",
       "location": "Toronto Island Airport",
       "latitude": "43.6275",
       "longitude": "-79.3962",
       "state": "ON",
       "state_name": "Ontario",
       "country": "CA",
       "iso_cc": "CA",
       "country_name": "Canada",
       "daylight": "D",
       "sky_desc": "14",
       "sky": "Partly sunny",
       "precip_desc": "*",
       "precip": "",
       "temp_desc": "5",
       "temp": "Quite cool",
       "air_desc": "*",
       "air": "",
       "description": "Partly sunny. Quite cool.",
       "temperature": "41.00",
       "temperature_scale": "F",
       "wind_speed": "20.68",
       "wind_dir": "70",
       "wind_short": "E",
       "wind_long": "East",
       "humidity": "70",
       "dew_point": "32.00",
       "comfort": "31.59",
       "baro_pressure": "30.36",
       "baro_tendency": "*",
       "barometer": "",
       "visibility": "9.00",
       "icon": "6",
       "icon_name": "mostly_cloudy",
       "iso8601": "2019-04-29T12:00:00.00-04:00"
   },
   "location": {
      "city": "54356",
      "city_name": "Toronto",
      "latitude": "43.66",
      "longitude": "-79.4",
      "location": "Toronto",
      "state": "ON",
      "state_name": "Ontario",
      "country": "CA",
      "iso_cc": "CA",
      "country_name": "Canada",
      "forecasts": [
         {
            "day_sequence": "1",
            "day_of_week": "2",
            "weekday": "Monday",
            "daylight": "D",
            "date": "042919",
            "iso8601": "2019-04-29T00:00:00.00-04:00",
            "high_temp": "43.88",
            "low_temp": "34.88",
            "temperature_scale": "F",
            "sky_desc": "26",
            "sky": "Increasing cloudiness",
            "precip_desc": "66",
            "precip": "Rain late",
            "temp_desc": "4",
            "temp": "Chilly",
            "air_desc": "13",
            "air": "Breezy",
            "description": "Rain late. Increasing cloudiness. Chilly.",
            "uv_index": "0",
            "uv": "Minimal",
            "wind_speed": "17.35",
            "wind_dir": "80",
            "wind_short": "E",
            "wind_long": "East",
            "humidity": "57",
            "dew_point": "27.34",
            "comfort": "32.99",
            "rainfall": "0.28",
            "snowfall": "*",
            "precip_prob": "45",
            "icon": "19",
            "icon_name": "rain",
            "beaufort": "4",
            "beaufort_desc": "Moderate breeze",
            "baro_pressure": "30.12"
         },
         { "day_sequence": "2", ... },
         { "day_sequence": "3", ... },
         { "day_sequence": "4", ... },
         { "day_sequence": "5", ... },
         { "day_sequence": "6", ... },
         { "day_sequence": "7", ... }
      ]
   }
}

```

The data object has two main parts: `observation` and `location.forecasts`.

**Observation** represents the most recent measured weather information.

**Forecasts** holds the weather forecast for the next 7 days. Until noon, the forecast will present current day as day 1, and will transition to show day 1 as the next days during the latter half of the day, based on the local time. As a note, all U.S. locations transition to the next day at the same time no matter the timezone (across the Continental U.S.). The general rule is that if the forecast is requested in the afternoon or evening, day 1 of the forecast presents the next day.


### Labels

The component may define a 'label' attribute that defines the text that will appear for this instance in the template editor.

This attribute holds a literal value, for example:

```
  <rise-data-weather
    id="weather01"
    label="Example Label"
    ...
  </rise-data-weather>
```

If it's not set, the label for the component defaults to "Weather", which is applied via the [generate_blueprint.js](https://github.com/Rise-Vision/html-template-library/blob/master/generate_blueprint.js) file for a HTML Template build/deployment.

### Attributes

This component receives the following list of attributes:

- **id** ( string / required ): Unique HTML id with format 'rise-data-weather-<NAME_OR_NUMBER>'.
- **label** ( string ): An optional label key for the text that will appear in the template editor. See 'Labels' section above.
- **scale** (string) “F”/ “C”. Sets Fahrenheit or Celsius as temperature scale. Defaults to “F”.
- **non-editable** ( empty / optional ): If present, it indicates this component is not available for customization in the template editor.
- **full-address** ( string / optional ): If present, will retrieve data based on that address in the Development environment, without requiring `RisePlayerConfiguration` to be mocked. This parameter will be ignored if the address can be retrieved on a Display or in the Editor.

### Events

The component sends the following events:

- **_configured_**: The component has initialized what it requires to and is ready to handle a _start_ event.
- **_data-update_**: Data has been retrieved and the data object is provided in `event.detail`.
- **_data-error_**: The weather data provider responded with an Error and the object is provided in `event.detail`.
- **_request-error_**: There was a problem making the request to the weather data provider and the message object is provided in `event.detail`.

The component listens for the following events:

- **_start_**: This event will initiate getting data from weather data provider. It can be dispatched to the component when configured event has been fired as that event indicates the component has initialized what it requires and is ready to make a request to the weather data provider.

### Errors

The component may log the following errors:

- **_request-error_**: There was a problem making the request to weather server.
- **_data-error_**: The weather server responded with an error.

In every case, examine event-details entry and the other event fields for more information about the problem.

### Component Lifecycle

Once configured, the component will wait for the `start` event before requesting data and start sending events.

On `start` event received, if a non-expired cached data is available the component will immediately send a `data-update` event and wait `30 minutes` to trigger a new data refresh.

To refresh the weather data, the component will request the data from the provider with a `60 seconds timeout` and will retry it `5 times`. Failing to receive a response, a `request-error` event will be fired and the component will wait `10 minutes` before trying to refresh the data again.

After the data is retrieved, the component will parse it, update the cache and send `data-update` event. In case of data inconsistencies, it will raise a `data-error` event.

### Caching Mechanism

For caching the weather data responses, the component uses browsers Cache API. 

Whenever the cached data is retrieved, the component checks the date header and delete it from cache in case it is expired. Also, to prevent cache from growing indefinitely, during component initialization all expired cache entries are deleted.

### Weather Data Provider (Tinbu API) Requests

Currently, Weather Component uses the following Tinbu API methods:
- `search` to find location ID.
- `current_extended` to get the current weather and 7 days forecast in one request.

Detailed documentation can be found [here](https://clients.customweather.com/APIDOCS/).

If you need to change `weatherServerConfig.providerURL`, you can use the following percent encoding tools:
```
2tap.com/javascript-percent-encoder
onlineasciitools.com/url-encode-ascii
```

#### Location
On a real Display, the API is called using the location provided by the Display address (city, state, country) configured in the Display Settings page via RisePlayerConfiguration object. If address is not available, it will fallback to the Display’s zip code, when provided. 
  
In Preview, Company address is going to be used, following the same approach.

#### Observation
If API returns multiplle observations, the nearest observation is selected.

### Weather Icons

For a sample set of weather icons, please download [this file](https://drive.google.com/open?id=1jDZR49GSnssGZirL2wXDqstqLrINtper). The file name of the images match the value returned by the `icon` field of the API responses. 

For a complete list of `icon_name` results, please refer to [this file](https://drive.google.com/open?id=18r4q5oPadxgKw2c5TlclFnP2ilLf-FDB).


## Built With
- [Polymer 3](https://www.polymer-project.org/)
- [Polymer CLI](https://github.com/Polymer/tools/tree/master/packages/cli)
- [WebComponents Polyfill](https://www.webcomponents.org/polyfills/)
- [npm](https://www.npmjs.org)

## Development

### Local Development Build
Clone this repo and change into this project directory.

Execute the following commands in Terminal:

```
npm install
npm install -g polymer-cli@1.9.7
npm run build
```

**Note**: If EPERM errors occur then install polymer-cli using the `--unsafe-perm` flag ( `npm install -g polymer-cli --unsafe-perm` ) and/or using sudo.

### Testing
You can run the suite of tests either by command terminal or interactive via Chrome browser.

#### Command Terminal
Execute the following command in Terminal to run tests:

```
npm run test
```

In case `polymer-cli` was installed globally, the `wct-istanbul` package will also need to be installed globally:

```
npm install -g wct-istanbul
```

#### Local Server
Run the following command in Terminal: `polymer serve`.

Now in your browser, navigate to:

```
http://127.0.0.1:8081/components/rise-data-weather/test/index.html
```
You can also run a specific test page by targeting the page directly:

```
http://127.0.0.1:8081/components/rise-data-weather/test/unit/rise-data-weather.html
```


## Submitting Issues
If you encounter problems or find defects we really want to hear about them. If you could take the time to add them as issues to this Repository it would be most appreciated. When reporting issues, please use the following format where applicable:

**Reproduction Steps**

1. did this
2. then that
3. followed by this (screenshots / video captures always help)

**Expected Results**

What you expected to happen.

**Actual Results**

What actually happened. (screenshots / video captures always help)

## Contributing
All contributions are greatly appreciated and welcome! If you would first like to sound out your contribution ideas, please post your thoughts to our [community](https://help.risevision.com/hc/en-us/community/topics), otherwise submit a pull request and we will do our best to incorporate it. Please be sure to submit test cases with your code changes where appropriate.

## Resources
If you have any questions or problems, please don't hesitate to join our lively and responsive [community](https://help.risevision.com/hc/en-us/community/topics).

If you are looking for help with Rise Vision, please see [Help Center](https://help.risevision.com/hc/en-us).

**Facilitator**

[Alex Deaconu](https://github.com/alex-deaconu "Alex Deaconu")
