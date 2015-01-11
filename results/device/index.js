"use strict";


$(document).ready(function () {

  var getParameters = function() {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    var urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2])

    return urlParams;
  };

  var getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  };

  var onFixtures = function(callback) {
    var profileIdsURL ='/results/device/fixtures/profile_ids.json',
        baseResultsURL = '/results/device/fixtures/results-',
        postfixResultsURL = '.json',
        urlParams = getParameters();

    var onProfileIdsReceived = function(data) {
      var nProfiles = data.profile_ids.length,
          profile_id, resultsUrl;
      console.log(nProfiles + " fixture profiles available");

      if (!!urlParams && 'fixture' in urlParams) {
        if (data.profile_ids.indexOf(urlParams['fixture']) >= 0) {
          profile_id = urlParams['fixture'];
          console.log("Fixture profile id specified by url parameter: " + profile_id);
        } else {
          throw new Error("Requested fixture profile id '" +
                          urlParams['fixture'] + "' not found in fixtures");
        }
      } else {
        profile_id = data.profile_ids[getRandomInt(0, nProfiles)];
        //profile_id = '00f8d2cf1c753f591e4a53a92046d334f63dd5e822f933aedaeae0f2625b3c47'
        console.log("Randomly selected fixture profile id: " + profile_id);
      }

      resultsUrl = baseResultsURL + profile_id + postfixResultsURL;
      $.getJSON(resultsUrl, function(data) {
        var fixturedInjectedResults = {
          getVersionCode: function () {
            return -1;
          },
          getResultsWrap: function () {
            return JSON.stringify(data);
          }
        };

        if (callback !== undefined) {
          callback(fixturedInjectedResults);
        }
      });
    };

    $.getJSON(profileIdsURL, onProfileIdsReceived);

  };


  var onResults = function(callback) {
    // TODO: in further versions, check versionCode if method of passing results changes.

    var onResultsReady = function (realResults) {
      console.log('App versionCode: ' + realResults.getVersionCode());
      var resultsWrap = JSON.parse(realResults.getResultsWrap());

      if (callback !== undefined) {
        callback(resultsWrap.results);
      }
    };

    if (typeof injectedResults == "undefined") {
      // We're in the browser
      console.log('Browser detected, using fixtures');
      // Get fixtures from url, then call onResultsReady
      onFixtures(onResultsReady);
    } else {
      // We're in the app
      console.log('App detected, using injected results');
      onResultsReady(injectedResults);
    }

  };


  onResults(function (results) {

    // results downloaded are a single subject's results

    $("<p>Number of results: " + results.length + "</p>").insertAfter("div#main p:last-child");

    // what do I need?

    // parsing done in three steps:
    // 1- fill in dictionnaries with lists
    // 2- collapse the lists in dictionnaries (mean of list)
    // 3- transform dictionaries (key value) into list of dictionnaries (standard for plotting purposes)

    // Dictionaries with lists
    var mindwandering_day_list = {
      "Mon": [], "Tue": [], "Wed": [], "Thu": [], "Fri": [], "Sat": [], "Sun": []
    };
    var mw_aware_count = {
      "Mostly Unaware": 0,
      "Totally Unaware": 0,
      "Mostly Aware": 0,
      "Totally Aware": 0
    };

    var thinking_focus_list = {
      "Words": [], "Images": [], "Sounds": []
    };
    var thinking_mw_list = {
      "Words": [], "Images": [], "Sounds": []
    };
    var aw_surround_people_list = {
      "0": [], "1": [], "2-5": [], "6-15": [],  "more than 15": []
    };
    var aw_surround_loc_list = {
      "Home": [], "Outside": [], "Work": [], "Commuting": [], "Public place": []
    };



    var days_list = Object.keys(mindwandering_day_list);
    var mindwandering_aware = [];

    // TODO: finalize and harmonize list of dict entry to be fed to plotting script



    var aware_cat = Object.keys(mw_aware_count);
    var people_cat = Object.keys(aw_surround_people_list);
    var location_cat = Object.keys(aw_surround_loc_list);


    // function to discretize [0,100] into categories
    function getCategory(value, min, max, categories) {
      var n_cat = categories.length;
      var step = (max - min) / n_cat;
      var cat;
      for (var i_cat = 0; i_cat < n_cat; i_cat++) {
        if (step * i_cat <= value && (step * (i_cat + 1)) >= value) {
          cat = categories[i_cat];
        }
      }
      return cat;
    }

    // mean of a list  (returns 0 for empty list)
    function mean(list) {
      var sum = 0;
      if (list.length>0) {
        var n = list.length;
        for (var i = 0; i < n; i++) {
          sum += list[i]
        }
        return sum/n;
      } else {
        return 0;
      }
    }

    // apply mean of a lists in values of dict
    function mean_of_dict_lists(dict) {
      var dict2 = {}
      var keys = Object.keys(dict);
      for (var i in keys) {
        dict2[keys[i]] = mean(dict[keys[i]]);
      }
      return dict2;
    }

    // for dicts whose values are all lists
    function dict_to_list(dict, fields) {
      var keys = Object.keys(dict);
      var n = keys.length;
      var list = [];
      for (var i_k = 0; i_k < n; i_k++) {
        var d = {};
        d[fields[0]] = keys[i_k];
        d[fields[1]] = dict[keys[i_k]];
        list.push( d );
      }
      return list;
    }

    //----------------------------
    // what to parse:
    // - daily rythm (% mindwandering / day) (DONE)
    // - awareness of mind wandering (Totally / mostly aware-unaware) (DONE)
    // - when mindwandering: thinking in images (DONE)
    // - when mindwandering: thinking in words (DONE)
    // - when mindwandering: thinking in sounds (DONE)
    // - awareness of surrounding depending on loc
    // - awareness of surrounding depending on people around
    //----------------------------
    // Begin and end Questionnaire parsing (aim is to produce a report)
    // - pairs {question:answer}
    // Morning Questionnaire
    // - {"day":[1,365], "day_string":"Wed Oct 22 2014" "morning.dreams": amount slept, "morning.valence": valence of dreams, ..}



    // some global stats on results
    var n_probe_results = 0

	 var begin_questionnaire = []
	 var end_questionnaire = []
	 var questionnaires_raw = []

	 var morning_q = []
    // iterating over all results for a particular subject
    for (var ir = 0; ir < results.length; ir++) {

      var rdata = results[ir]["result_data"];
      var tipe = rdata['type']

      // parsing probe sequences only
      if (tipe === "probe") {
        n_probe_results += 1

        // extract pageGroups
        var pageGroups = rdata["pageGroups"];
        var systemTimestamp = pageGroups[0]['pages'][0]['systemTimestamp']
        var d = new Date(systemTimestamp);
        var day = days_list[d.getDay()]; // getting day name from index
        var focus;
        var aware;
        var location;
        var people;
        var activities;

        // iterating over page groups
        for (var i = 0; i < pageGroups.length; i++) {

          // thought questions
          if (pageGroups[i]['name'] === "thought") {

            // extracting though questions
            var questions = pageGroups[i]['pages'][0]['questions'];

            // iterating over though questions
            for (var iq = 0; iq < questions.length; iq++) {
              var questionName = questions[iq]["questionName"];

              if (questions[iq]["answer"] != undefined) {

                // all thought questions are sliders
                var answers = questions[iq]["answer"]["sliders"];
                if (answers != undefined) {

                  // - daily rythm (% mindwandering / day)
                  if ("How focused were you on what you were doing?" in answers) {
                    var answer = answers["How focused were you on what you were doing?"]

                    if (answer != undefined) {
                      mindwandering_day_list[day].push(answer)
                      focus = (answer > 50) ? "Focused Mind" : "Wandering Mind";
                    }
                    // $("<p> Focus (1:focused, 0: mindwander)" + focus +  "</p>").insertAfter("div#main p:last-child");
                  }

                  // - awareness of mind wandering (Totally / mostly aware-unaware)
                  if ("How aware were you of your mind wandering?" in answers) {
                    aware = answers["How aware were you of your mind wandering?"]

                    if (aware>-1) {
                      mw_aware_count[getCategory(aware,0,100,aware_cat)] += 1;
                      mindwandering_aware.push(aware)
                    }
                  }

                  // - when mindwandering: thinking in images
                  if ("Were you thinking with visual images?" in answers) {
                    var images = answers["Were you thinking with visual images?"]
                    //$("<p> Focus (1:focused, 0: mindwander)" + focus +  "</p>").insertAfter("div#main p:last-child");
                  }
                  // - when mindwandering: thinking in words
                  if ("Were you thinking in words?" in answers) {
                    var words = answers["Were you thinking in words?"]

                  }
                  // - when mindwandering: thinking in sounds
                  if ("Were you thinking with sounds?" in answers) {
                    var sounds = answers["Were you thinking with sounds?"]
                  }

                  // - awareness of surrounding depending on loc
                  if ("How aware were you of your surroundings?" in answers) {
                    var aware = answers["How aware were you of your surroundings?"]
                  }
                }
              }

            }

            if (focus != "") {
              if (focus === "Focused Mind"){
                thinking_focus_list["Words"].push(words);
                thinking_focus_list["Sounds"].push(sounds);
                thinking_focus_list["Images"].push(images);
              }
              if (focus === "Wandering Mind"){
                thinking_mw_list["Words"].push(words);
                thinking_mw_list["Sounds"].push(sounds);
                thinking_mw_list["Images"].push(images);
              }


            }
          }

          // context questions
          if (pageGroups[i]['name'] === "context") {

            // extracting questions list
            var questions = pageGroups[i]['pages']; //[0]['questions'];
            //$("<p> number of context questions: " + questions.length + "</p>").insertAfter("div#main p:last-child");

            // iterating over questions
            for (var iq = 0; iq < questions.length; iq++) {
              var question = questions[iq]['questions'];

              for (var isq = 0; isq < question.length; isq++) {

                var subquestion = question[isq];
                var questionName = subquestion["questionName"];

                //$("<p>" + questionName  + "</p>").insertAfter("div#main p:last-child");

                location = null;
                if (questionName == "probe.location") {
                  if (subquestion["answer"] != undefined) {
                    location = subquestion["answer"]['choices'];
                  }
                }

                if (questionName == "probe.currentActivityAutoList") {
                  if (subquestion["answer"] != undefined) {
                    activities = subquestion["answer"]['choices'];
                  }
                }

                people = null;
                if (questionName == "probe.people") {
                  if (subquestion["answer"] != undefined) {
                    people = subquestion["answer"]['sliders']["How many people are there?"];

                  }
                }
              }
            }
          }
        }
        // end of loop over page groups


        if (aware > -1) {
          if (people != undefined) {
            aw_surround_people_list[getCategory(people, 0, 100, people_cat)].push(aware);
          }
          if (location != undefined) {
            // location is a list from the location matrix
            for (var i = 0; i < location.length; i++) {
              aw_surround_loc_list[location[i]].push(aware);
            }
          }
        }


      } else if (tipe === "endQuestionnaire" || tipe === "beginQuestionnaire") {
      	//$("#results").append('<p>'+tipe+'</p>');
      	var pageGroups = rdata["pageGroups"];
			// iterating over page groups
         for (var i = 0; i < pageGroups.length; i++) {
          // questions
            var questionnaire_name = pageGroups[i]['name']  // MAAS, SODAS ...
            // iterating over pages
         	var pages = pageGroups[i]['pages']
            for (var j = 0; j < pages.length; j++){
	            var questionnaire_page_name = pages[j]['name']  // MAASPage1, SODASPage1 ...
	            var questions = pages[j]['questions'];
	            for (var k = 0; k < questions.length; k++){
	            	var question = questions[k]
	            	var question_name = question['questionName']
	            	var question_string = Object.keys(question['answer']['sliders'])[0] // dictionnary has a single key
	            	var answer = question['answer']['sliders'][question_string]
	            	//$("#results").append('<p>'+question_name+' : '+answer.toString()+'</p>');

	            	var dict = {}
	            	dict["value"]=answer
	            	dict["name"]=questionnaire_name
	            	dict["index"]= parseInt(question_name.substring(questionnaire_name.length))
	            	dict["type"]=tipe
	            	questionnaires_raw.push(dict)
	            	if (tipe === "endQuestionnaire") {
							end_questionnaire.push(dict)
	            	} else if (tipe === "beginQuestionnaire") {
							begin_questionnaire.push(dict)
	            	}
	            }
            }

       }
      } else if (tipe === "morningQuestionnaire") {

      	var pageGroups = rdata["pageGroups"];
      	// getting date information
        var systemTimestamp = pageGroups[0]['pages'][0]['systemTimestamp']
        var d = new Date(systemTimestamp);
 		  var start = new Date(d.getFullYear(), 0, 0);
        var diff = d - start;
        var oneDay = 1000 * 60 * 60 * 24;
        var day = Math.floor(diff / oneDay);


			// iterating over page groups
         for (var i = 0; i < pageGroups.length; i++) {
          // questions
            var questionnaire_name = pageGroups[i]['name']  // morning

         	var page = pageGroups[i]['pages'][0] // single page
	            var questionnaire_page_name = page['name']  // MorningUniquePage
	            var questions = page['questions'];


	            // 3 questions
	            var dict = {}
	            dict["day"]=day
	            dict["day_string"]=d.toDateString().substring(0,10)	// String of the day
	            dict["date"]=d
	            for (var k = 0; k < questions.length; k++){
	            	var question = questions[k]
	            	var question_name = question['questionName'].split(".")[1] // morning.valence, morning.sleep, morning dreams (Removing the morning)
	            	var question_string = Object.keys(question['answer']['sliders'])[0] // dictionnary has a single key
	            	var answer = question['answer']['sliders'][question_string]
	            	dict[question_name]=answer
	            }
	            morning_q.push(dict)
       }
      }

    }


	 //$("#results").append('<p>'+JSON.stringify(end_questionnaire)+'</p>');



    // ---------------- daily rythms mindwandering


    var mindwandering_day_av = mean_of_dict_lists(mindwandering_day_list)
    var aw_surround_people_av = mean_of_dict_lists(aw_surround_people_list)
    var aw_surround_loc_av = mean_of_dict_lists(aw_surround_loc_list)

    // ---------------- awareness of mind wandering (Totally / mostly aware-unaware)

    // Names
    // data_awareness_mw
    // dataset_awareness_loc
    // dataset_awareness_ppl
    // dataset_wsi
    // daily_rythm_mw
    $("<p>" + JSON.stringify(mw_aware_count) + "</p>").insertAfter("div#main p:last-child");

    var data_awareness_mw = dict_to_list(mw_aware_count, ["label","value"]);
    var dataset_awareness_loc = dict_to_list(aw_surround_loc_av,["label","value"]);
    var dataset_awareness_ppl = dict_to_list(aw_surround_people_av,["label","value"]);
    var d1 = dict_to_list(mean_of_dict_lists(thinking_focus_list),["label","value"])
    var d2 = dict_to_list(mean_of_dict_lists(thinking_mw_list),["label","value"])
    var dataset_wsi = d1.concat([{"type":"none","value":0}]).concat(d2);
    var daily_rythm_mw = dict_to_list(mindwandering_day_av,["x","y"]);

    // ------------------------------------------------------------

	 morning_q.sort(function(a, b){return a.day-b.day}) // sorting increasing date
	 var exp_days = []
	 var exp_days_string = []
    for (var i = 0, length = morning_q.length; i < length; i++) {
      exp_days.push(morning_q[i].day)
      exp_days_string.push(morning_q[i].day_string)
    }
    var day_start = exp_days[0]
    var day_end = exp_days[exp_days.length-1]
    var date_start = morning_q[0].date
    var date_end = morning_q[morning_q.length-1].date

//$("#results").append('<p>'+JSON.stringify(begin_questionnaire)+'</p>');

	 //$("#results").append('<p>'+JSON.stringify(morning_q)+'</p>');
	 //$("#results").append('<p> exp_days:'+JSON.stringify(exp_days)+'</p>');
	 //$("#results").append('<p> exp_days_string:'+JSON.stringify(exp_days_string)+'</p>');
	 //$("#results").append('<p> min:'+date_start.toDateString()+'</p>');
	 //$("#results").append('<p> max:'+date_end.toDateString()+'</p>');
// my try to do a grap design where I understand every single line


	// ----------------------------------------------------------------
	// Computing questionnaires' scores

   var q_names = ["Mindfulness", "Dissociation", "Rumination", "Reflection"];


	function scores(array) {
		var score = [[],[],[],[]];
		var score_mean = [];
      for (var i = 0; i < array.length; i++) {
    		var item = array[i];
    		var type = item.type;
    		if (item.name==="MAAS" && item.index<16){ score[0].push(100-item.value);}
    		if (item.name==="SODAS"){ score[1].push(item.value);}
    		if (item.name==="RR"){
    			var value = item.value;
    			if ($.inArray(item.index, [ 6, 9, 10, 13, 14, 17, 20, 24 ])) {value = 100-item.value;}
    			if (item.index<13){score[2].push(value);}
    			if (item.index>12){score[3].push(value);}
			}
		}

    for (var i = 0; i < score.length; i++) {
    		var dict = {};
    		dict["index"]=i
    		dict["name"]=q_names[i]
    		dict["type"]=type
    		dict["value"]=	parseFloat(mean(score[i]).toFixed(1))
    		score_mean.push(dict);}
    return score_mean;
 };

   var beg_score = scores(begin_questionnaire);
   var end_score = scores(end_questionnaire);
   var score = beg_score.concat(end_score)

	//$("#results").append('<p>'+JSON.stringify(score)+'</p>');

//------------------DATA----------------------




    var labels_days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    var labels_type = ["Focused Mind", "Wandering Mind"];

// hard coded colors, not the smartest thing if labels change
    var label_colors = {"Words":"green",
      "Images":"orange",
      "Sounds":"red",
      "none":"white",
      "0":"red",
      "1":"blue",
      "2-5":"green",
      "6-15":"orange",
      "more than 15":"purple",
      "Mostly Unaware":"red",
      "Totally Unaware":"green",
      "Mostly Aware":"blue",
      "Totally Aware":"purple",
      "Public place":"red",
      "Home":"blue",
      "Outside":"green",
      "Work":"orange",
      "Commuting":"purple"};


// apply mean of a lists in values of dict
    function add_color_info(list, color_dict) {
      for (var i = 0; i < list.length; i++) {
        list[i].color = color_dict[list[i].label]
      }
      return list
    }


    data_awareness_mw = add_color_info(data_awareness_mw, label_colors);
    dataset_awareness_loc = add_color_info(dataset_awareness_loc, label_colors);
    dataset_awareness_ppl = add_color_info(dataset_awareness_ppl, label_colors);
    dataset_wsi = add_color_info(dataset_wsi, label_colors);

//------------------- Augment lists with color information -----------------------


//-------------------DIMENSIONS-----------------------



    var barPadding = 1;

    var  margins_bar = {
      top: 50,
      right: 20,
      bottom:50,
      left: 50,
      bottom_caption:20
    };

    var width = 320 - (margins_bar.left + margins_bar.right), //width
        height = 250; //height

    var  margins_pie = {
      top: 30,
      right: 30,
      bottom:30,
      left: 50
    };

    var radius = Math.min(width-margins_pie.left-margins_pie.right, height-margins_pie.top-margins_pie.bottom)*0.4, //radius
        inner_radius = radius*1,
        outer_radius = radius*0.5,
        color = d3.scale.category20c(); //builtin range of colors


//--------------------------------------------------
// Declaring graph objects
//--------------------------------------------------


    var awareness_pie = {
      data: data_awareness_mw,
      display: function () {
        var vis = d3.select("#mindwandering_awareness")
            .append("svg:svg") // SVG element in <body>
            .data([awareness_pie.data]) // link data to document
            .attr("width", width)
            .attr("height", height)
            .append("svg:g") //make a group to hold our pie chart
            .attr("transform", "translate(" + width/2 + "," + (radius+margins_pie.top) + ")") // translate center


        // declaring the arc form
        var arc = d3.svg.arc() //this will create <path> elements for us using arc data
            .innerRadius(inner_radius)
            .outerRadius(outer_radius);

        var pie = d3.layout.pie() //this will create arc data for us given a list of values
            .value(function (d) {
              return d.value;
            }); //we must tell it out to access the value of each element in our data array

        var arcs = vis.selectAll("g.slice") //selects all <g>  with class slice (there aren't any yet)
            .data(pie) //associatepie data ( array of arcs:  startAngle, endAngle, value properties)
            .enter() //create <g> elements for every "extra" data element
            .append("svg:g") //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
            .attr("class", "slice"); // styling

        arcs.append("svg:path")
            .attr("fill", function (d, i) {
              return awareness_pie.data[i].color;
            }) //set the color for each slice to be chosen from the color function defined above
            .attr("d", arc); //this creates the actual SVG path using the associated data (pie) with the arc drawing function

        var labels = vis.selectAll("text")
            .data(pie)
            .enter()
            .append("text")
            .attr("text-anchor", "middle")
          // positioning the label: center of arc, a bit further
            .attr("x", function (d) {
              var a = d.startAngle + (d.endAngle - d.startAngle) / 2 - Math.PI / 2;
              d.cx = Math.cos(a) * (radius - 10);
              return d.x = Math.cos(a) * (radius);
            })
            .attr("y", function (d) {
              var a = d.startAngle + (d.endAngle - d.startAngle) / 2 - Math.PI / 2;
              d.cy = Math.sin(a) * (radius - 80);
              return d.y = Math.sin(a) * (radius-5);
            })
            .text(function (d, i) {
              // Do not plot results pie label if no contribution to pie chart
              if (awareness_pie.data[i].value < 1) {
                return "";
              } else {
                return awareness_pie.data[i].label;
              }
            })
            .style("font-size","10pt")
            .style("fill","white");
      }
    }

//============== questionnaires result ==================

    var quest_plot = {


      display : function () {

		 var local_height = 100;
		var local_left= 100;

        var vis = d3.select("#personality_questionnaire_results")
            .append("svg")
            .attr("width", width)
            .attr("height", local_height);

        var x = d3.scale.linear()
                .domain([0,100])
                .range([local_left , width-margins_bar.right]),

	 		o = d3.scale.ordinal()
      		.domain(["Mindfulness", "Dissociation", "Rumination", "Reflection"])
      		.rangePoints([10, local_height-10]),

         xAxis = d3.svg.axis()
            .scale(x)
            .tickValues([0,100])
            .tickSize(1)
            .orient("bottom"),

         yAxis = d3.svg.axis()
            .scale(o)
            .tickSize(1)
            .orient("left");

        vis.append('svg:g')
            .attr('class', 'x axis')
            .attr("fill", "white")
            .attr('transform', 'translate(0,' + 5 + ')')
            .call(xAxis);

        vis.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + local_left + ',0)')
            .attr("fill", "white")
            .call(yAxis);

        vis.selectAll("circle")
            .data(score)
            .enter()
            .append("circle")
            .attr("cx", function(d, i) { return x(d.value); })
            .attr("cy", function(d, i) { return o(d.name); })
            .attr("r", 5)
            .attr("fill", function(d, i) { if (d.type === "beginQuestionnaire"){return "red";}
            else {return "white";} });



      }
    }


//==============words_and_sounds==================

    var ws_bar = {

      data : dataset_wsi,
      labels : labels_type,
      display : function () {

        var rect_width = ((width-margins_bar.left-margins_bar.right) / ws_bar.data.length);

        var vis = d3.select("#words_and_sounds")
            .append("svg")
            .attr("width", width)
            .attr("height", height);


        var x = d3.scale.ordinal()
                .domain(ws_bar.labels)
                .rangePoints([rect_width*1.5 +margins_bar.left, width-margins_bar.right-rect_width*1.5]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom, margins_bar.top])
                .domain([d3.min(ws_bar.data, function(d) {return d.value;}),
                  d3.max(ws_bar.data, function(d) {return d.value;})*1.3]), // extend graph by 20% to allow for legend on top

            xAxis = d3.svg.axis()
                .scale(x)
                .tickSize(1)
                .orient("bottom"),

            yAxis = d3.svg.axis()
                .scale(yRange)
                .tickSize(1)
                .orient('left')
                .tickSubdivide(true);


        vis.append('svg:g')
            .attr('class', 'x axis')
            .attr("fill", "white")
            .attr('transform', 'translate(0,' + (height - margins_bar.bottom) + ')')
            .call(xAxis);

        vis.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margins_bar.left) + ',0)')
            .attr("fill", "white")
            .call(yAxis);

        vis.selectAll("rect")
            .data(ws_bar.data)
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
              return (margins_bar.left) + i * rect_width;
            })
            .attr("y", function(d) {
              return yRange(d.value) ;
            })
            .attr("width", (width-margins_bar.left-margins_bar.right) / ws_bar.data.length - barPadding)
            .attr("height", function(d) {
              return  (height - margins_bar.bottom) - (yRange(d.value) );
            })
            .attr("fill", function(d) {
              return d.color;//"rgb(0, 0, " + (d.value * 10) + ")"; // value dependent color
            });


        // adding labels
        vis.selectAll("text")
            .data(ws_bar.data)
            .enter()
            .append("text")
            .text(function(d) {
              return d.value;
            })
            .attr("x", function(d, i) {
              return i * (width / ws_bar.data.length) + (width / ws_bar.data.length - barPadding) / 2;
            })
            .attr("y", function(d) {
              return height - (d.value * 4) + 14;  //15 is now 14
            })
            .attr("font-family", "sans-serif")
            .attr("font-size", "11px")
            .attr("fill", "white")
            .attr("text-anchor", "middle");


        //

        vis.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 )
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("Type strength");

        // adding legend

        var legend_sq_size = 20;
        var legend_txt_size = (width-margins_bar.left-margins_bar.right)/4
        var delta = 2;

        vis.selectAll("rect.legend")
            .data(ws_bar.data.slice(0, 3)) // pick 3 first
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
              return margins_bar.left + i*(legend_sq_size+legend_txt_size) -legend_sq_size;
            })
            .attr("y", function(d, i) {
              return  legend_sq_size ;
            })
            .attr("width", legend_sq_size)
            .attr("height", legend_sq_size)
            .attr("fill", function(d) {
              return d.color;//"rgb(0, 0, " + (d.value * 10) + ")"; // value dependent color
            });

        vis.selectAll("text.legend")
            .data(ws_bar.data.slice(0, 3)) // pick 3 first
            .enter()
            .append("text")
            .attr("x", function(d, i) {
              return margins_bar.left + (i)*(legend_sq_size+legend_txt_size)  + delta;
            })
            .attr("y", function(d, i) {
              return  legend_sq_size*1.8  ;
            })
            .text(function(d, i) {
              return  d.label ;
            })
            .style("fill","white");
      }
    }


// =============== Line plot weekly rythm ==================


    var weekly_line = {

      data : daily_rythm_mw,
      labels : labels_days,
      display : function () {

        var vis =  d3.select("#focus_weekly_rythms")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        var labels_days = [];
        for (var i = 0; i < weekly_line.data.length; i++) {
          labels_days.push(weekly_line.data[i].x);
        }


        var x = d3.scale.ordinal()
                .domain(weekly_line.labels)
                .rangePoints([margins_bar.left, width-margins_bar.right]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom , margins_bar.top]).domain([0,100]),

            xAxis = d3.svg.axis()
                .scale(x)
                .tickSize(1)
                .orient("bottom"),

            yAxis = d3.svg.axis()
                .scale(yRange)
                .tickSize(1)
                .orient('left')
                .tickSubdivide(true);

        vis.append('svg:g')
            .attr('class', 'x axis')
            .attr("fill", "white")
            .attr('transform', 'translate(0,' + (height - margins_bar.bottom) + ')')
            .call(xAxis);

        vis.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margins_bar.left) + ',0)')
            .attr("fill", "white")
            .call(yAxis);

        var lineFunc = d3.svg.line()
            .x(function(d,i) {
              return x(weekly_line.labels[i]);
            })
            .y(function(d) {
              return yRange(d.y);
            })
            .interpolate('linear');

        var meanlineFunc = d3.svg.line()
            .x(function(d,i) {
              return x(d.x);
            })
            .y(function(d) {
              return yRange(30);
            })
            .interpolate('linear');


        vis.append('svg:path')
            .attr('d', lineFunc(weekly_line.data))
            .attr('stroke-width', 2)
            .attr("stroke", "white")
            .attr('fill', 'none');

        vis.append('svg:path')
            .attr('d', meanlineFunc(weekly_line.data))
            .attr('stroke-width', 2)
            .attr("stroke", "white")
            .style("stroke-dasharray", "4,4")
            .attr('fill', 'none');

        vis.selectAll("dot")
            .data(weekly_line.data)
            .enter().append("circle")
            .attr("r", 3.5)
            .attr("fill", "white")
            .attr("cx", function(d,i) { return x(weekly_line.labels[i]); })
            .attr("cy", function(d) { return yRange(d.y); });

        vis.append("text")
            .attr("x", width / 2 )
            .attr("y",  height - margins_bar.bottom_caption )
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("Date");

        vis.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 )
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("% MindWandering");
      }
    }


// =============== Line plot daily sleep ==================


    var sleep_line = {

      data : morning_q,
      display : function () {

        var vis =  d3.select("#sleep_line")
            .append("svg")
            .attr("width", width)
            .attr("height", height);


        //var x = d3.scale.linear()
        //        .domain([day_start, day_end])
        //        .range([margins_bar.left, width-margins_bar.right]),


			var everyDate = d3.time.day.range(date_start, date_end);
			var everyOtherCorrect = everyDate.filter(function (d, i) {
   			 return i % 3 == 0;
			});

        var x = d3.time.scale()
        			.domain([ date_start, date_end ])
               .range([margins_bar.left, width-margins_bar.right]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom , margins_bar.top]).domain([0,100]),

            xAxis = d3.svg.axis()
                .scale(x)
                //.ticks(d3.time.days.utc, 2)
					 .tickValues(everyOtherCorrect)
                .tickFormat(d3.time.format('%b %a %d'))
                .tickSize(0.7)
                .orient("bottom"),

         yAxis = d3.svg.axis()
                .scale(yRange)
                .tickSize(1)
                .orient('left')
                .tickSubdivide(true);

        vis.append('svg:g')
            .attr('class', 'x axis')
            .attr("fill", "white")
            .attr('transform', 'translate(0,' + (height - margins_bar.bottom) + ')')
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");;



        vis.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margins_bar.left) + ',0)')
            .attr("fill", "white")
            .call(yAxis);

        var lineFunc = d3.svg.line()
            .x(function(d,i) { return x(d.date); })
            .y(function(d,i) { return yRange(d.sleep); })
            .interpolate('linear');
        var lineFunc2 = d3.svg.line()
            .x(function(d,i) { return x(d.date); })
            .y(function(d,i) { return yRange(d.dreams); })
            .interpolate('linear');
        var lineFunc3 = d3.svg.line()
            .x(function(d,i) { return x(d.date); })
            .y(function(d,i) { return yRange(d.valence); })
            .interpolate('linear');

        vis.selectAll("dot")
            .data(morning_q)
            .enter().append("circle")
            .attr("r", 3.5)
            .attr("fill", "white")
            .attr("cx", function(d,i) { return x(d.date); })
            .attr("cy", function(d) { return yRange(d.sleep); });
        vis.selectAll("dot")
            .data(morning_q)
            .enter().append("circle")
            .attr("r", 3.5)
            .attr("fill", "red")
            .attr("cx", function(d,i) { return x(d.date); })
            .attr("cy", function(d) { return yRange(d.dreams); });
        vis.selectAll("dot")
            .data(morning_q)
            .enter().append("circle")
            .attr("r", 3.5)
            .attr("fill", "green")
            .attr("cx", function(d,i) { return x(d.date); })
            .attr("cy", function(d) { return yRange(d.valence); });


        vis.append('svg:path')
            .attr('d', lineFunc(morning_q))
            .attr('stroke-width', 2)
            .attr("stroke", "white")
            .attr('fill', 'none');
        vis.append('svg:path')
            .attr('d', lineFunc2(morning_q))
            .attr('stroke-width', 2)
            .attr("stroke", "red")
            .attr('fill', 'none');
        vis.append('svg:path')
            .attr('d', lineFunc3(morning_q))
            .attr('stroke-width', 2)
            .attr("stroke", "green")
            .attr('fill', 'none');


        //vis.append("text")
        //    .attr("x", width / 2 )
        //    .attr("y",  height - margins_bar.bottom_caption )
        //    .style("text-anchor", "middle")
        //    .attr("fill", "white")
        //    .attr("class", "caption")
        //    .text("Date");

        vis.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 )
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("% MindWandering");
      }
    }





//==============awareness_of_surroundings_location==================

    var aware_loc_bar = {

      data : dataset_awareness_loc,
      display : function () {
        var rect_width = ((width-margins_bar.left-margins_bar.right) / (aware_loc_bar.data.length));
        var nbars = (aware_loc_bar.data.length);

        var labels = [];
        for (var i = 0; i < aware_loc_bar.data.length; i++) {
          labels.push(aware_loc_bar.data[i].label);
        }

        var vis = d3.select("#awareness_of_surroundings_location")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        var x = d3.scale.ordinal()
                .domain(labels)
                .rangePoints([margins_bar.left + rect_width/2 , margins_bar.left + rect_width/2 + (nbars-1)*rect_width]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom, margins_bar.top])
                .domain([0, d3.max(aware_loc_bar.data, function(d) {
                  return d.value;
                })]),

            xAxis = d3.svg.axis()
                .scale(x)
                .tickSize(1)
                .orient("bottom"),

            yAxis = d3.svg.axis()
                .scale(yRange)
                .tickSize(1)
                .orient('left')
                .tickSubdivide(true);

        vis.append('svg:g')
            .attr('class', 'x axis')
            .attr("fill", "white")
            .attr('transform', 'translate(0,' + (height - margins_bar.bottom) + ')')
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-25)")
            .style("text-anchor", "end");

        vis.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margins_bar.left) + ',0)')
            .attr("fill", "white")
            .call(yAxis);

        vis.selectAll("rect")
            .data(aware_loc_bar.data)
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
              return (margins_bar.left) + i * rect_width;
            })
            .attr("y", function(d) {
              return yRange(d.value) ;
            })
            .attr("width", rect_width - barPadding)
            .attr("height", function(d) {
              return  (height - margins_bar.bottom) - (yRange(d.value) );
            })
            .attr("fill", function(d) {
              return d.color;//"rgb(0, 0, " + (d.value * 10) + ")"; // value dependent color
            });


        // ylabel
        vis.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 )
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("class", "caption")
            .attr("fill", "white")
            .text("% Awareness of surrounding");

      }
    }



// ---------------------------------


    var aware_ppl_bar = {

      data : dataset_awareness_ppl,
      display : function () {

        var rect_width = ((width-margins_bar.left-margins_bar.right) / aware_loc_bar.data.length);
        var nbars = (aware_loc_bar.data.length);

        var labels = [];
        for (var i = 0; i < aware_ppl_bar.data.length; i++) {
          labels.push(aware_ppl_bar.data[i].label);
        }

        var vis = d3.select("#awareness_of_surroundings_people")
            .append("svg")
            .attr("width", width)
            .attr("height", height);


        var x = d3.scale.ordinal()
                .domain(labels)
                .rangePoints([margins_bar.left + rect_width/2 , margins_bar.left + rect_width/2 + (nbars-1)*rect_width]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom-margins_bar.bottom_caption, margins_bar.top])
                .domain([0, d3.max(aware_ppl_bar.data, function(d) {
                  return d.value;
                })]),

            xAxis = d3.svg.axis()
                .scale(x)
                .tickSize(1)
                .orient("bottom"),


            yAxis = d3.svg.axis()
                .scale(yRange)
                .tickSize(1)
                .orient('left')
                .tickSubdivide(true);



        vis.append('svg:g')
            .attr('class', 'x axis')
            .attr("fill", "white")
            .attr('transform', 'translate(0,' + (height - margins_bar.bottom-margins_bar.bottom_caption) + ')')
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-25)")
            .style("text-anchor", "end");

        vis.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margins_bar.left) + ',0)')
            .attr("fill", "white")
            .call(yAxis);

        vis.selectAll("rect")
            .data(aware_ppl_bar.data)
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
              return (margins_bar.left) + i * rect_width;
            })
            .attr("y", function(d) {
              return yRange(d.value) ;
            })
            .attr("width", (width-margins_bar.left-margins_bar.right) / aware_ppl_bar.data.length - barPadding)
            .attr("height", function(d) {
              return  (height - margins_bar.bottom-margins_bar.bottom_caption) - (yRange(d.value) );
            })
            .attr("fill", function(d) {
              return d.color;//"rgb(0, 0, " + (d.value * 10) + ")"; // value dependent color
            });


        // adding labels
        vis.selectAll("text")
            .data(aware_ppl_bar.data)
            .enter()
            .append("text")
            .text(function(d) {
              return d.label;
            })
            .attr("x", function(d, i) {
              return i * (width / aware_ppl_bar.data.length) + (width / aware_ppl_bar.data.length - barPadding) / 2;
            })
            .attr("y", function(d) {
              return h - (d.value * 4) + 14;  //15 is now 14
            })
            .attr("font-family", "sans-serif")
            .attr("font-size", "11px")
            .attr("fill", "white")
            .attr("text-anchor", "middle");

        // xlabel
        vis.append("text")
            .attr("x", width / 2 )
            .attr("y",  height - margins_bar.bottom_caption/2 )
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("Number of people around");

        // ylabel
        vis.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 )
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("% Awareness of surrounding");
      }
    }


//------------- Display graph objects

    function pie_ok() {
      var total = 0;
      for (var i = 0; i < data_awareness_mw.length; i++) {
        total += data_awareness_mw[i].value;
      }
      return total>0;
    }


    if (n_probe_results > 10) {

      $('#stats-intro').append('Displayed results are based on ' + n_probe_results.toString() + ' answers to our daily questionnaires')

      // Construct results dynamically
      $("#results").append("<h2>Personal results</h2>");
      $("#results").append("<p>On average, people mind-wander a lot: over 40% of their time.</p>");
      $("#results").append("<h3>Weekly rhythms</h3>");
      $("#results").append("<p>Mind-wandering depends on the day of the week!</p>")
      $("#results").append("<div id='focus_weekly_rythms'></div>")
      $("#results").append("<h3>Know yourself</h3>")
      $("#results").append("<p>People are usually aware of their mind-wandering 49% of the time. But they can be more or less aware of it &mdash; see how much.</p>");
      $("#results").append("<div id='mindwandering_awareness'></div>")
      $("#results").append("<h3>Words or images? Maybe sounds</h3>");
      $("#results").append("<p>Most people think a lot in words. See how this changes depending on whether people are mind-wandering or not.</p>");
      $("#results").append("<div id='words_and_sounds'></div>")
      $("#results").append("<h3>Surroundings</h3>");
      $("#results").append("<p>People's awareness of their surroundings is pretty much independant of where they are...</p>");
      $("#results").append("<div id='awareness_of_surroundings_location'></div>");
      $("#results").append("<p>... but it sure depends on how many people are around! The more people around, the greater the awareness, except when we're alone or in a crowd.</p>")
      $("#results").append("<div id='awareness_of_surroundings_people'></div>")

      $("#results").append("<h3>Sleep Analysis</h3>");
      $("#results").append("<div id='sleep_line'></div>")
      $("#results").append("<p align='center'> Sleep, <font color='red'>Dreams</font>, <font color='green'>Valence</font> </p>")

      $("#results").append("<h3>Personality Analysis</h3>");
      $("#results").append("<div id='personality_questionnaire_results'></div>")
      $("#results").append("<p align='center'>  <font color='red'>Begin</font>, End </p>")

      // check awareness data
      if (pie_ok()) {
        awareness_pie.display();
      }
      ws_bar.display();
      weekly_line.display();
      aware_loc_bar.display();
      aware_ppl_bar.display();
		sleep_line.display();
      quest_plot.display();
    } else {
      $('#stats-intro').append("Sorry! You haven't completed enough questionnaires for us to build results (Need more than 10 answers, you have "+n_probe_results.toString()+")")

    }

    $("#results").append("<h2>That's it for today!</h2>");
    $("#results").append("<p>Thanks again for using the app!</p>");
    //$("#results").append('<p>Want some more? <a href="#" id="save-raw">Explore your raw results</a></p>');
    //$("#save-raw").click(function() {
      //var resultsBlob = new Blob([JSON.stringify({"results": results}, null, '  ')],
                                 //{type: "text/plain;charset=utf-8"}),
          //now = new Date().toISOString();

      //saveAs(resultsBlob, "results-" + now + ".json");
    //});

  });


});

