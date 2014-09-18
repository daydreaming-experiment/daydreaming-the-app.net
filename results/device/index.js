"use strict";
$(document).ready(function() {

  $("<p>App versionCode: " + injectedResults.getVersionCode() + "</p>").insertAfter("div#main p:last-child");

  var resultsWrap = JSON.parse(injectedResults.getResultsWrap());
  var nResults = resultsWrap.results.length();
  $("<p>Number of results: " + nResults + "</p>").insertAfter("div#main p:last-child");

  //var data = [4, 8, 15, 16, 23, 42];
  //var x = d3.scale.linear()
      //.domain([0, d3.max(data)])
      //.range([0, 320]);
  //var t = d3.scale.linear()
      //.domain([0, d3.max(data)])
      //.range([0, 2000]);

  //d3.select('.chart')
    //.selectAll('div')
      //.data(data)
    //.enter().append('div')
      //.style('width', '0')
      //.text(function(d) { return d; })
      //.transition('linear')
      //.ease('linear')
      //.duration(function(d) { return t(d) })
      //.style('width', function(d) { return x(d) + 'px'; });

});
