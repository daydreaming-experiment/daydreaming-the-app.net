"use strict";


function onFixtures(callback) {
    var fixturesURL = 'http://daydreaming-the-app.net/results/device/results-fixtures.json';

    $.getJSON(fixturesURL, function (data) {
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
}


function onResults(callback) {
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
        console.log('Browser detected');
        // Get fixtures from url, then call onResultsReady
        onFixtures(onResultsReady);
    } else {
        // We're in the app
        console.log('App detected');
        onResultsReady(injectedResults);
    }
}

$(document).ready(function () {

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
        var thinking_cat = Object.keys(thinking_focus_list);


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


        // iterating over all results for a particular subject
        for (var ir = 0; ir < results.length; ir++) {

            var rdata = results[ir]["result_data"];
            var tipe = rdata['type']

            // parsing probe sequences only
            if (tipe === "probe") {

                // extract pageGroups
                var pageGroups = rdata["pageGroups"];
                var systemTimestamp = pageGroups[0]['pages'][0]['systemTimestamp']
                var d = new Date(systemTimestamp);
                var day = days_list[d.getDay() - 1]; // getting day name from index
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

                                // - daily rythm (% mindwandering / day)
                                if ("How focused were you on what you were doing?" in answers) {
                                    var answer = answers["How focused were you on what you were doing?"]
                                    mindwandering_day_list[day].push(answer)
                                    focus = (answer > 50) ? "Focused Mind" : "Wandering Mind";
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
                    aw_surround_people_list[getCategory(people, 0, 100, people_cat)].push(aware);
                    aw_surround_loc_list[getCategory(people, 0, 100, location_cat)].push(aware);
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

        // ------------------------------------------------------------


// my try to do a grap design where I understand every single line

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

        var width = 400, //width
            height = 310, //height
            radius = 140, //radius
            inner_radius = radius - 70,
            outer_radius = radius - 25,
            color = d3.scale.category20c(); //builtin range of colors

        var barPadding = 1;

        var  margins = {
            top: 40,
            right: 20,
            bottom:40,
            left: 50,
            bottom_caption:5
        };

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
                    .attr("transform", "translate(" + width/2 + "," + (radius+margins.top) + ")") // translate center

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
                        return d.y = Math.sin(a) * (radius-50);
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



//==============words_and_sounds==================

        var ws_bar = {

            data : dataset_wsi,
            labels : labels_type,
            display : function () {

                var rect_width = ((width-margins.left-margins.right) / ws_bar.data.length);

                var vis = d3.select("#words_and_sounds")
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height);

                var x = d3.scale.ordinal()
                        .domain(ws_bar.labels)
                        .rangePoints([rect_width*1.5 +margins.left, width-margins.right-rect_width*1.5]),

                    yRange = d3.scale.linear().range([height - margins.bottom, margins.top])
                        .domain([d3.min(ws_bar.data, function(d) {
                            return d.value;
                        }), d3.max(ws_bar.data, function(d) {
                            return d.value;
                        })*1.3  ]), // extend graph by 20% to allow for legend on top

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
                    .attr('transform', 'translate(0,' + (height - margins.bottom) + ')')
                    .call(xAxis);

                vis.append('svg:g')
                    .attr('class', 'y axis')
                    .attr('transform', 'translate(' + (margins.left) + ',0)')
                    .attr("fill", "white")
                    .call(yAxis);

                vis.selectAll("rect")
                    .data(ws_bar.data)
                    .enter()
                    .append("rect")
                    .attr("x", function(d, i) {
                        return (margins.left) + i * rect_width;
                    })
                    .attr("y", function(d) {
                        return yRange(d.value) ;
                    })
                    .attr("width", (width-margins.left-margins.right) / ws_bar.data.length - barPadding)
                    .attr("height", function(d) {
                        return  (height - margins.bottom) - (yRange(d.value) );
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
                        return h - (d.value * 4) + 14;  //15 is now 14
                    })
                    .attr("font-family", "sans-serif")
                    .attr("font-size", "11px")
                    .attr("fill", "white")
                    .attr("text-anchor", "middle");

                // adding legend

                var legend_sq_size = 20

                vis.selectAll("rect.legend")
                    .data(ws_bar.data.slice(0, 3)) // pick 3 first
                    .enter()
                    .append("rect")
                    .attr("x", function(d, i) {
                        return margins.left + legend_sq_size/2;
                    })
                    .attr("y", function(d, i) {
                        return  legend_sq_size + i*(legend_sq_size*1.1) ;
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
                        return margins.left +legend_sq_size*2.2;
                    })
                    .attr("y", function(d, i) {
                        return  legend_sq_size*1.5 + i*(legend_sq_size*1.1) ;
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
                        .rangePoints([margins.left, width-margins.right]),

                    yRange = d3.scale.linear().range([height - margins.bottom , margins.top]).domain([0,100]),

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
                    .attr('transform', 'translate(0,' + (height - margins.bottom) + ')')
                    .call(xAxis);

                vis.append('svg:g')
                    .attr('class', 'y axis')
                    .attr('transform', 'translate(' + (margins.left) + ',0)')
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
                    .attr("y",  height - margins.bottom_caption )
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



//==============awareness_of_surroundings_location==================

        var aware_loc_bar = {

            data : dataset_awareness_loc,
            display : function () {

                var rect_width = ((width-margins.left-margins.right) / aware_loc_bar.data.length);

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
                        .rangePoints([margins.left+rect_width/2, width-margins.right-margins.left]),

                    yRange = d3.scale.linear().range([height - margins.bottom, margins.top])
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
                    .attr('transform', 'translate(0,' + (height - margins.bottom) + ')')
                    .call(xAxis)
                    .selectAll("text")
                    .attr("transform", "rotate(-25)")
                    .style("text-anchor", "end");;



                vis.append('svg:g')
                    .attr('class', 'y axis')
                    .attr('transform', 'translate(' + (margins.left) + ',0)')
                    .attr("fill", "white")
                    .call(yAxis);

                vis.selectAll("rect")
                    .data(aware_loc_bar.data)
                    .enter()
                    .append("rect")
                    .attr("x", function(d, i) {
                        return (margins.left) + i * rect_width;
                    })
                    .attr("y", function(d) {
                        return yRange(d.value) ;
                    })
                    .attr("width", (width-margins.left-margins.right) / aware_loc_bar.data.length - barPadding)
                    .attr("height", function(d) {
                        return  (height - margins.bottom) - (yRange(d.value) );
                    })
                    .attr("fill", function(d) {
                        return d.color;//"rgb(0, 0, " + (d.value * 10) + ")"; // value dependent color
                    });


                // xlabel
                //vis.append("text")
                //    .attr("x", width / 2 )
                //    .attr("y",  height - margins.bottom_caption )
                //    .style("text-anchor", "middle")
                //    .attr("fill", "white")
                //    .attr("class", "caption")
                //    .text("Locations");

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

                var rect_width = ((width-margins.left-margins.right) / aware_loc_bar.data.length);

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
                        .rangePoints([margins.left+rect_width/2, width-margins.right-margins.left]),

                    yRange = d3.scale.linear().range([height - margins.bottom, margins.top])
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
                    .attr('transform', 'translate(0,' + (height - margins.bottom) + ')')
                    .call(xAxis);

                vis.append('svg:g')
                    .attr('class', 'y axis')
                    .attr('transform', 'translate(' + (margins.left) + ',0)')
                    .attr("fill", "white")
                    .call(yAxis);

                vis.selectAll("rect")
                    .data(aware_ppl_bar.data)
                    .enter()
                    .append("rect")
                    .attr("x", function(d, i) {
                        return (margins.left) + i * rect_width;
                    })
                    .attr("y", function(d) {
                        return yRange(d.value) ;
                    })
                    .attr("width", (width-margins.left-margins.right) / aware_ppl_bar.data.length - barPadding)
                    .attr("height", function(d) {
                        return  (height - margins.bottom) - (yRange(d.value) );
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
                    .attr("y",  height - margins.bottom_caption )
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

        awareness_pie.display();
        ws_bar.display();
        weekly_line.display();
        aware_loc_bar.display();
        aware_ppl_bar.display();


    });

});

