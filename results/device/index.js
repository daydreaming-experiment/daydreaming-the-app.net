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
          getProfileWrap: function () {
            return JSON.stringify({profile: {}});
          },
          getExpStartTimestamp: function() {
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
      var versionCode = realResults.getVersionCode(),
          resultsWrap = JSON.parse(realResults.getResultsWrap()),
          profileWrapJson, expStartTimestamp;

      if (realResults.getProfileWrap !== undefined) {
        profileWrapJson = realResults.getProfileWrap();
      } else {
        profileWrapJson = '{"profile": {}}';
      }
      var profileWrap = JSON.parse(profileWrapJson);

      if (realResults.getExpStartTimestamp !== undefined) {
        expStartTimestamp = realResults.getExpStartTimestamp();
      } else {
        expStartTimestamp = -1;
      }

      console.log('App versionCode: ' + versionCode);
      console.log('expStartTimestamp: ' + expStartTimestamp);
      console.log('Profile: ' + profileWrapJson);

      if (callback !== undefined) {
        callback(versionCode, expStartTimestamp, profileWrap.profile, resultsWrap.results);
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


  onResults(function (versionCode, expStartTimestamp, profile, results) {
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
    
    var mindwandering_day = [];   
    
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

	 var begin_questionnaire = [];
	 var end_questionnaire = [];
	 var questionnaires_raw = [];

	 var morning_q = [];

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
                      mindwandering_day.push(answer)
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
            	var isValid = true;
	            for (var k = 0; k < questions.length; k++){

	            	var question = questions[k]
	            	var question_name = question['questionName'].split(".")[1] // morning.valence, morning.sleep, morning dreams (Removing the morning)

					   if('answer' in question) {       // si la reponse est dans la question ...
					   	if('sliders' in question['answer']) {
		            		var question_string = Object.keys(question['answer']['sliders'])[0] // dictionnary has a single key
		            		var answer = question['answer']['sliders'][question_string]
		            		if (question_name === "sleep") { answer = Math.floor(answer*16/100); }
	   	         		dict[question_name]=answer
	   	         	}
	            	} else { isValid = false; } // skipping questions without answers
	            }
	            if (isValid){ morning_q.push(dict); }
       }
      }

    }




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
    var daily_rythm_mw_av = mean(mindwandering_day)

    // ------------------------------------------------------------

    if (morning_q.length >0) {

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

	}
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

   var score_av_pop = [{"name":"Mindfulness", "value":54.5},  {"name":"Dissociation", "value":50}, {"name":"Rumination", "value":53.5},  {"name":"Reflection", "value":61.5}];


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


var debug = false;

if (debug){
$("#results").append(JSON.stringify(data_awareness_mw)+"<p></p>");
$("#results").append(JSON.stringify(score_av_pop)+"<p></p>");
$("#results").append(JSON.stringify(dataset_wsi)+"<p></p>");
$("#results").append(JSON.stringify(daily_rythm_mw)+"<p></p>");
$("#results").append(JSON.stringify(dataset_awareness_loc)+"<p></p>");
$("#results").append(JSON.stringify(morning_q)+"<p></p>");
$("#results").append(JSON.stringify(dataset_awareness_ppl)+"<p></p>");
}



    var awareness_pie = {
    	
      data: data_awareness_mw,
      
      check : function () {
      	   var total = 0;
      		for (var i = 0; i < this.data.length; i++) {
        			total += this.data[i].value;
      		}
      		return total>0;      
		 },      
      
      display: function () {
      	
        var o_data = this.data; // local copy of data in function
      	
        var vis = d3.select("#mindwandering_awareness")
            .append("svg:svg") // SVG element in <body>
            .data([this.data]) // link data to document
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
              return o_data[i].color;
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
              if (o_data[i].value < 1) {
                return "";
              } else {
                return o_data[i].label;
              }
            })
            .style("font-size","10pt")
            .style("fill","white");
      }
    }

//============== questionnaires result ==================

    var quest_plot = {


      data: score,
      data_av_pop: score_av_pop,

		check : function () {

			for (var i = 0; i < score.length; i++) {
        			var item = score[i];
        			if ( isNaN(item.value) ) { return false; }
        			if ( (item.name == undefined) ) { return false; }
      	}
      	return true;
			},

      display : function () {

		 var local_height = 100;
		 var local_top_margin = 10;
		 var local_bottom_padding = 30;
		 var local_left= 100;

       var vis = d3.select("#personality_questionnaire_results")
            .append("svg")
            .attr("width", width)
            .attr("height", local_top_margin + local_height+local_bottom_padding);

       var x = d3.scale.linear()
                .domain([0,100])
                .range([local_left , width-margins_bar.right]),

	 		o = d3.scale.ordinal()
      		.domain(["Mindfulness", "Dissociation", "Rumination", "Reflection"])
      		.rangePoints([local_top_margin, local_height]),


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
            .attr('transform', 'translate(0,' + (local_top_margin+ local_height) + ')')
            .call(xAxis);

        vis.append('svg:g')
            .attr('class', 'yaxis')
            .attr('transform', 'translate(' + local_left + ',0)')
            .call(yAxis);

        vis.selectAll("circle_mean")
            .data(this.data_av_pop)
            .enter()
            .append("circle")
            .attr("cx", function(d, i) { return x(d.value); })
            .attr("cy", function(d, i) { return o(d.name); })
            .attr("r", 5)
            .attr("fill", "grey")
            .style("opacity", "0.5");

        vis.selectAll("circle_sub")
            .data(this.data)
            .enter()
            .append("circle")
            .attr('class', 'q')
            .attr("cx", function(d, i) { return x(d.value); })
            .attr("cy", function(d, i) { return o(d.name); })
            .attr("r", 5)
            .attr("fill", function(d, i) { if (d.type === "beginQuestionnaire"){return "white";}
            else {return "red";} });
      }
    }


//==============words_and_sounds==================

    var ws_bar = {

      data : dataset_wsi,
      
      labels : labels_type,
      
		check : function () {
			for (var i = 0; i < dataset_wsi.length; i++) {
        			var item = dataset_wsi[i];
        			if ( isNaN(item.value) ) { return false; }
        			}
      	return true;
			 },      
      
      display : function () {

        var rect_width = ((width-margins_bar.left-margins_bar.right) / ws_bar.data.length);

        var vis = d3.select("#words_and_sounds")
            .append("svg")
            .attr("width", width)
            .attr("height", height);


        var x = d3.scale.ordinal()
                .domain(this.labels)
                .rangePoints([rect_width*1.5 +margins_bar.left, width-margins_bar.right-rect_width*1.5]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom, margins_bar.top])
                .domain([d3.min(this.data, function(d) {return d.value;}),
                  d3.max(this.data, function(d) {return d.value;})*1.3]), // extend graph by 20% to allow for legend on top

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
            .data(this.data)
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
              return (margins_bar.left) + i * rect_width;
            })
            .attr("y", function(d) {
              return yRange(d.value) ;
            })
            .attr("width", (width-margins_bar.left-margins_bar.right) / this.data.length - barPadding)
            .attr("height", function(d) {
              return  (height - margins_bar.bottom) - (yRange(d.value) );
            })
            .attr("fill", function(d) {
              return d.color;//"rgb(0, 0, " + (d.value * 10) + ")"; // value dependent color
            });


        // adding labels
        vis.selectAll("text")
            .data(this.data)
            .enter()
            .append("text")
            .text(function(d) {
              return d.value;
            })
            .attr("x", function(d, i) {
              return i * (width / this.data.length) + (width / this.data.length - barPadding) / 2;
            })
            .attr("y", function(d) {
              return height - (d.value * 4) + 14;  //15 is now 14
            })
            .attr("font-family", "sans-serif")
            .attr("font-size", "11px")
            .attr("fill", "white")
            .attr("text-anchor", "middle");


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
            .data(this.data.slice(0, 3)) // pick 3 first
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
              return d.color; //"rgb(0, 0, " + (d.value * 10) + ")"; // value dependent color
            });

        vis.selectAll("text.legend")
            .data(this.data.slice(0, 3)) // pick 3 first
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
      data_av: daily_rythm_mw_av,
      labels : labels_days,      

		check : function () { 
			for (var i = 0; i < this.data.length; i++) {
        			var item = this.data[i];
        			if ( isNaN(item.y) ) { return false; }
        			}
      	return true;
		},      
      
      display : function () {


		var o_labels = this.labels;

        var vis =  d3.select("#focus_weekly_rythms")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        var labels_days = [];
        for (var i = 0; i < this.data.length; i++) {
          labels_days.push(this.data[i].x);
        }

        var x = d3.scale.ordinal()
                .domain(this.labels)
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
              return x(o_labels[i]);
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
              return yRange(this.data_av);
            })
            .interpolate('linear');


        vis.append('svg:path')
            .attr('d', lineFunc(this.data))
            .attr('stroke-width', 2)
            .attr("stroke", "white")
            .attr('fill', 'none');

        vis.append('svg:path')
            .attr('d', meanlineFunc(this.data))
            .attr('stroke-width', 2)
            .attr("stroke", "white")
            .style("stroke-dasharray", "4,4")
            .attr('fill', 'none');

        vis.selectAll("dot")
            .data(this.data)
            .enter().append("circle")
            .attr("r", 3.5)
            .attr("fill", "white")
            .attr("cx", function(d,i) { return x(o_labels[i]); })
            .attr("cy", function(d) { return yRange(d.y); });

        vis.append("text")
            .attr("x", width / 2 )
            .attr("y",  height - margins_bar.bottom_caption )
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("Day");

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
      
		check : function () { 

			for (var i = 0; i < this.data.length; i++) {
        			var item = this.data[i];
        			if ( isNaN(item.dreams) ) {
        				return false; }
        			if ( isNaN(item.valence) ) { 
        				return false; }
        			if ( isNaN(item.sleep) ) { 
        				return false; }
        			}
			return true;
		 },      
      
      display : function () {

        var vis =  d3.select("#sleep_line")
            .append("svg")
            .attr("width", width)
            .attr("height", height);



        //we want less than 10 dates on screen, which means we have to skip total/10
         var day_skip = Math.ceil((date_end - date_start) / (1000*60*60*24)/10)


			var everyDate = d3.time.day.range(date_start, date_end);
			var everyOtherCorrect = everyDate.filter(function (d, i) {
   			 return i % day_skip == 0;
			});

        var x = d3.time.scale()
        			.domain([ date_start, date_end ])
               .range([margins_bar.left, width-margins_bar.right]),


            yRange = d3.scale.linear().range([height - margins_bar.bottom , margins_bar.top]).domain([0,16]),


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
            .style("text-anchor", "end");



        vis.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margins_bar.left) + ',0)')
            .attr("fill", "white")
            .call(yAxis);

        var lineFunc = d3.svg.line()
            .x(function(d,i) { return x(d.date); })
            .y(function(d,i) { return yRange(d.sleep); })
            .interpolate('linear');


        vis.append('svg:path')
            .attr('d', lineFunc(this.data))
            .attr('stroke-width', 2)
            .attr("stroke", "white")
            .attr('fill', 'none')
            .style("stroke-linejoin", "round");

        vis.selectAll("dot")
            .data(morning_q)
            .enter().append("ellipse")
            //.attr("rx", 3.5)
            .attr("ry", function(d,i) { return 3.5 + d.dreams*0.1; })
            .attr("rx", function(d,i) { return 3.5 + d.dreams*0.1; })
            .attr("fill", function(d,i) { var col = (Math.floor(d.valence*2.55)).toString(); return "rgba("+col+","+col+","+col+",0.8)";} )
            .attr("cx", function(d,i) { return x(d.date); })
            .attr("cy", function(d) { return yRange(d.sleep); });


        vis.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 )
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .attr("class", "caption")
            .text("Hours of sleep");
      }
    }





//==============awareness_of_surroundings_location==================

    var aware_loc_bar = {

      data : dataset_awareness_loc,

		check : function () { 
			for (var i = 0; i < this.data.length; i++) {
					var item = this.data[i];
					console.log(item)
        			if ( item.value == undefined ) {
        				return false; }
        			if ( item.color == undefined ) {
        				return false; }
        			if ( item.label == undefined ) {
        				return false; }
     	 	}
      return true; },            
      
      display : function () {
        var rect_width = ((width-margins_bar.left-margins_bar.right) / (this.data.length));
        var nbars = (this.data.length);

        var labels = [];
        for (var i = 0; i < this.data.length; i++) {
          labels.push(this.data[i].label);
        }

        var vis = d3.select("#awareness_of_surroundings_location")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        var x = d3.scale.ordinal()
                .domain(labels)
                .rangePoints([margins_bar.left + rect_width/2 , margins_bar.left + rect_width/2 + (nbars-1)*rect_width]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom, margins_bar.top])
                .domain([0, d3.max(this.data, function(d) {
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
            .data(this.data)
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

		check : function () { 
			for (var i = 0; i < this.data.length; i++) {
					var item = this.data[i];
        			if ( item.value == undefined ) {
        				return false; }
        			if ( item.color == undefined ) {
        				return false; }
        			if ( item.label == undefined ) {
        				return false; }
     	 	}
      return true; }, 		
		
      
      display : function () {

        var rect_width = ((width-margins_bar.left-margins_bar.right) / this.data.length);
        var nbars = (this.data.length);

        var labels = [];
        for (var i = 0; i < this.data.length; i++) {
          labels.push(this.data[i].label);
        }

        var vis = d3.select("#awareness_of_surroundings_people")
            .append("svg")
            .attr("width", width)
            .attr("height", height);


        var x = d3.scale.ordinal()
                .domain(labels)
                .rangePoints([margins_bar.left + rect_width/2 , margins_bar.left + rect_width/2 + (nbars-1)*rect_width]),

            yRange = d3.scale.linear().range([height - margins_bar.bottom-margins_bar.bottom_caption, margins_bar.top])
                .domain([0, d3.max(this.data, function(d) {
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
            .data(this.data)
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
            .data(this.data)
            .enter()
            .append("text")
            .text(function(d) {
              return d.label;
            })
            .attr("x", function(d, i) {
              return i * (width /this.data.length) + (width / this.data.length - barPadding) / 2;
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



    if (n_probe_results > 10) {

      $('#stats-intro').append('You now get to see your personalized results, based on your ' + n_probe_results.toString() + ' answers to our daily notifications');

      // Construct results dynamically
      $("#results").append("<h2>Personal results</h2>");


      // check data
      if (weekly_line.check()) { 
     	 	$("#results").append("<h3>Mind-wandering & Weekly rhythms</h3>");
      	$("#results").append("<p>People mind wander a lot: between 30% and 50% of their time. Look at the dotted line below to see your own percentage. And notice that mind-wandering also depends on the day of the week!</p>");
      	$("#results").append("<div id='focus_weekly_rythms'></div>");
      	weekly_line.display();
      }
      if (awareness_pie.check()) {  
	      $("#results").append("<h3>Knowing or loosing yourself in daydreams</h3>");
   	   $("#results").append("<p>People are usually aware of their mind-wandering. Yet about 20% tends to be totally unnoticed. Has the phone ever caught you totally zoning out?</p>");
      	$("#results").append("<div id='mindwandering_awareness'></div>");
      	awareness_pie.display();
      }
      if (ws_bar.check()) {
	      $("#results").append("<h3>Words or images? Maybe sounds</h3>");
   	   $("#results").append("<p>Thought used to be described as a kind of inner speech. However, you may have noticed you were sometimes thinking with vivid visual or auditory images. See how this changed depending on whether you were focused or mind-wandering.</p>");
      	$("#results").append("<div id='words_and_sounds'></div>");
      	 ws_bar.display();
      }
      if (aware_loc_bar.check()) {
	      $("#results").append("<h3>Surroundings</h3>");
   	   $("#results").append("<p>Awareness of your surroundings was pretty much independant of where you were...</p>");
      	$("#results").append("<div id='awareness_of_surroundings_location'></div>");
      	$("#results").append("<p>... but it sure depended on how many people were around you!</p>");
      	$("#results").append("<div id='awareness_of_surroundings_people'></div>");
      	aware_loc_bar.display();
      }
      if (aware_ppl_bar.check()) { 
      	aware_ppl_bar.display();
      }
      
		if (sleep_line.check()) { 
	      $("#results").append("<h3>Sleep Analysis</h3>");
   	   $("#results").append("<p>And what about nightdreaming? See how much you slept each night of this month, and how vivid (size of the dot) and positive (pale) or negative (dark) your dreams were these very nights!</p>");
      	$("#results").append("<div id='sleep_line'></div>");
      	$("#results").append("<p align='center'> Size: Dream Vivacity</p> <p align='center'> Color: <font color='black'>Nightmare</font>/<font color='white'>Positive Dream</font> </p>");
			sleep_line.display();
		}
      if (quest_plot.check()) { 
	      $("#results").append("<h3>Personality Analysis</h3>");
	      $("#results").append("<p>Finally, the questionnaires you filled at the experiment's end and beginning intended to measure your Mindfulness, Dissociation, Ruminative and Reflective habits. Compare yourself to the average, and to how you scored a month ago. Have you become more mindful?</p>");
   	   $("#results").append("<div id='personality_questionnaire_results'></div>");
	      $("#results").append("<p align='center'>  <font color='white'>Begin</font>, <font color='red'>End</font>, <font color='grey'>Population average</font> </p>");
   	   $("#results").append("<p>Note: Mindfulness is a tendency to be aware of yourself and your environment at each and every moment – without loosing yourself in automatization or in your thoughts. Meditation trains mindfulness. Dissociation is a tendency to totally ignore part of ourself or your environment. It seems a key component of hypnotizability, or the ability to be absorbed in games or movies. Rumination is related to the anxiety we sometimes feel about ourselves. Reflection is how much you a intectually interested by yourself – in philosophical ways. </p>");
      	quest_plot.display(); 
      }
      
      $("#results").append("<h2>What now?</h2>");
      $("#results").append("<p>You can now tweet @daydreaming_app or tell us on facebook things you would like to see in your results. </p>");
      $("#results").append("<p>We are researchers, not commercials, but we’d be glad to help you if we can. </p>");

      $("#results").append("<p>Also, feel free to use the app as much as you want: from now on your results will always be available and up to date. </p>");
            
      
      
    } else {
      $('#stats-intro').append("Sorry! You haven't completed enough questionnaires for us to build results (Need more than 10 answers, you have "+n_probe_results.toString()+"). You can respond to more notifications and your results will be available");
    }

    $("#results").append("<h2>That's it for today!</h2>");
    $("#results").append("<p>Thanks again for using the app!</p>");

    // Add raw results download if provided by the app
    if (typeof resultsInterface == "undefined") {
      // The app doesn't provide raw results download
      console.log("App doesn't provide raw results download -> not showing button");
    } else {
      // The app does provide raw results download
      console.log('App provides raw results download -> showing button');
      $("#results").append('<p>Want some more? <a href="#" id="save-raw">Explore your raw results</a></p>');
      $("#save-raw").click(function() {
        resultsInterface.saveRawResults();
      });
    }
    
//----------------------------------

function postImageToFacebook( authToken, filename, mimeType, imageData, message ) {
	// this is the multipart/form-data boundary we'll use
	var boundary = '----ThisIsTheBoundary1234567890';
	// let's encode our image file, which is contained in the var
	var formData = '--' + boundary + '\r\n'
	formData += 'Content-Disposition: form-data; name="source"; filename="' + filename + '"\r\n';
	formData += 'Content-Type: ' + mimeType + '\r\n\r\n';
	for ( var i = 0; i < imageData.length; ++i ) {
		formData += String.fromCharCode( imageData[ i ] & 0xff );
	}
	formData += '\r\n';
	formData += '--' + boundary + '\r\n';
	formData += 'Content-Disposition: form-data; name="message"\r\n\r\n';
	formData += message + '\r\n'
	formData += '--' + boundary + '--\r\n';
	var xhr = new XMLHttpRequest();
	xhr.open( 'POST', 'https://graph.facebook.com/me/photos?access_token=' + authToken, true );
	xhr.onload = xhr.onerror = function() {
		console.log( xhr.responseText );
	};
	xhr.setRequestHeader( "Content-Type", "multipart/form-data; boundary=" + boundary );
	xhr.sendAsBinary( formData );
};


function postCanvasToFacebook(canvas) {
	var data = canvas.toDataURL("image/png");
	var encodedPng = data.substring(data.indexOf(',') + 1, data.length);
	var decodedPng = Base64Binary.decode(encodedPng);
	FB.getLoginStatus(function(response) {
		console.log(response.status);
	  if (response.status === "connected") {	
		postImageToFacebook(response.authResponse.accessToken, "daydreaming-the-app", "image/png", decodedPng, "http://daydreaming-the-app.net/");
	  } else if (response.status === "not_authorized") {
		 FB.login(function(response) {
			postImageToFacebook(response.authResponse.accessToken, "daydreaming-the-app", "image/png", decodedPng, "http://daydreaming-the-app.net/");
		 }, {scope: "publish_stream"});
	  } else {
		 FB.login(function(response)  { 
			postImageToFacebook(response.authResponse.accessToken, "daydreaming-the-app", "image/png", decodedPng, "http://daydreaming-the-app.net/");
		 }, {scope: "publish_stream"});
	  }
	 });
};


    $("#share").append("<button type='button'> Share on Facebook! </button>")
    $('div#share').on('click', function() {
        html2canvas([document.body], {
            onrendered: function(canvas) {
               postCanvasToFacebook(canvas)
            }
        });       
 	});


    

  });

});

