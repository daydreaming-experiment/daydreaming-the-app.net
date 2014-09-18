"use strict";

function getFixtures() {
  return {
    getVersionCode: function() {
      // We're in the browser, not the app
      return -1;
    },
    getResultsWrap: function() {
      return JSON.stringify({
        "results": [
          {
            "created_at": "2014-09-18T01:27:36.190688Z",
            "exp_id": "a5f0430af850a1c4cc278bf310379a0a65451a19c5a339d099fbb3c65cb14d2b",
            "id": "68505aab41f8fa64bf821f68f42d0b14e05fd7fed943460431fc05171e08d593",
            "profile_id": "9c43b32bb86e34a6bad2b74a4321179e2434323d02075ae8a02ff2a8afe66e9c",
            "result_data": {
              "locationAccuracy": 21,
              "locationAltitude": 0,
              "locationLatitude": 48.8387585,
              "locationLongitude": 2.4073776,
              "status": "statusCompleted",
              "timestamp": 1411003535949
            }
          },
          {
            "created_at": "2014-09-18T01:16:00.753720Z",
            "exp_id": "a5f0430af850a1c4cc278bf310379a0a65451a19c5a339d099fbb3c65cb14d2b",
            "id": "ea8b64dfc4fc500bb8e89cd329d60aff2880f1c0f55031e5fbb4bae7903f0b1c",
            "profile_id": "9c43b32bb86e34a6bad2b74a4321179e2434323d02075ae8a02ff2a8afe66e9c",
            "result_data": {
              "locationAccuracy": 38,
              "locationAltitude": 0,
              "locationLatitude": 48.8387558,
              "locationLongitude": 2.4074371,
              "status": "statusCompleted",
              "timestamp": 1411002332746
            }
          },
          {
            "created_at": "2014-09-18T03:11:44.936959Z",
            "exp_id": "a5f0430af850a1c4cc278bf310379a0a65451a19c5a339d099fbb3c65cb14d2b",
            "id": "f401a5f3d0d7449ebf21cb8e03392bef094a7140db57ae9d34d016c3eaaa1363",
            "profile_id": "9c43b32bb86e34a6bad2b74a4321179e2434323d02075ae8a02ff2a8afe66e9c",
            "result_data": {
              "locationAccuracy": 20,
              "locationAltitude": 0,
              "locationLatitude": 48.8387671,
              "locationLongitude": 2.4073889,
              "status": "statusCompleted",
              "timestamp": 1411004732111
            }
          }
        ]
      });
    }
  };
}


function getResults() {
  // First get fixtures if we're not in the app, but in a real browser
  if (injectedResults === undefined) {
    var injectedResults = getFixtures();
  }

  // TODO: in further versions, check versionCode if method of passing results changes.
  console.log('App versionCode: ' + injectedResults.getVersionCode());

  var resultsWrap = JSON.parse(injectedResults.getResultsWrap());
  return resultsWrap.results;
}

$(document).ready(function() {

  var results = getResults();
  $("<p>Number of results: " + results.length + "</p>").insertAfter("div#main p:last-child");

});
