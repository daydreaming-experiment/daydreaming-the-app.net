"use strict";

function getResults() {
  // TODO: in further versions, check versionCode if method of passing results changes.
  console.log('App versionCode: ' + injectedResults.getVersionCode());

  var resultsWrap = JSON.parse(injectedResults.getResultsWrap());
  return resultsWrap.results;
}

$(document).ready(function() {

  var results = getResults();
  $("<p>Number of results: " + results.length + "</p>").insertAfter("div#main p:last-child");

});
