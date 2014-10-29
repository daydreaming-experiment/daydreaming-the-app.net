"use strict";


function onFixtures(callback) {
  var fixturesURL = '/results/device/results-fixtures.json';

  $.getJSON(fixturesURL, function(data) {
    var fixturedInjectedResults = {
      getVersionCode: function() {
        return -1;
      },
      getResultsWrap: function() {
        return JSON.stringify(data);
      }
    };

    if (callback !== undefined) {
      callback(fixturedInjectedResults);
    }
  });
}


function onResults(callback) {
  // TODO: in further versions, check versionCode if method of passing results changes.

  var onResultsReady = function(realResults) {
    console.log('App versionCode: ' + realResults.getVersionCode());
    var resultsWrap = JSON.parse(realResults.getResultsWrap());

    if (callback !== undefined) {
      callback(resultsWrap.results);
    }
  };

  if (typeof injectedResults == "undefined") {
    // We're in the browser
    console.log('Browser detected');
    // Get fixtures from url, then call onResultsReady
    onFixtures(onResultsReady);
  } else {
    // We're in the app
    console.log('App detected');
    onResultsReady(injectedResults);
  }
}

$(document).ready(function() {

  onResults(function(results) {
    console.log("Got " + results.length + " results to process");
    //$("<p>Number of results: " + results.length + "</p>").insertAfter("div#main p:last-child");
  });

  var global = $('#global'),
      personal = $('#personal');
  $('#switch').click(function() {
    global.toggleClass('selected');
    personal.toggleClass('selected');
  });

});
