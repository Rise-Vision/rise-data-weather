# Weather Data Web Component

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
      ** TODO **
    </rise-data-weather>
...

  </body>
```

### Data Object

When listening for the "data-update" event, the `event.detail` object returned is an object of the following format:

** TODO **

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

If it's not set, the label for the component defaults to "weather", which is applied via the    [generate_blueprint.js](https://github.com/Rise-Vision/html-template-library/blob/master/generate_blueprint.js) file for a HTML Template build/deployment.

### Attributes

This component receives the following list of attributes:

** TODO **

### Events

The component sends the following events:

- **_configured_**: The component has initialized what it requires to and is ready to handle a _start_ event.
- **_data-update_**: Data has been retrieved and the data object is provided in `event.detail`
- **_data-error_**: The weather server responded with a Error and the object is provided in `event.detail`
- **_request-error_**: There was a problem making the JSONP request to weather server and the message object is provided in `event.detail`.

The component is listening for the following events:

- **_start_**: This event will initiate getting data from weather server. It can be dispatched on the component when _configured_ event has been fired as that event indicates the component has initialized what it requires to and is ready to make a request to the weather server to retrieve data.

### Errors

The component may log the following errors:

- **_request-error_**: There was a problem making the request to weather server.
- **_data-error_**: The weather server responded with an error.
- **_Display is not permissioned to show weather.

In every case, examine event-details entry and the other event fields for more information about the problem.

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
