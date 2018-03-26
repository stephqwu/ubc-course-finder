/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
let Rquery = {"WHERE": {}, "OPTIONS": {"COLUMNS": []}};
let Cquery = {"WHERE": {}, "OPTIONS": {"COLUMNS": []}};

CampusExplorer.buildQuery = function() {

    let Csuffixes = ["audit", "avg", "dept", "fail", "id", "instructor", "pass", "title", "uuid", "year"];
    let Rsuffixes = ["address", "fullname", "furniture", "href", "lat", "lon", "name", "number", "seats", "shortname",
        "type"];

    for (var k = 0; k < Csuffixes.length; k++) {

        var column = document.getElementById("courses-columns-field-"+ Csuffixes[k]);
        var group = document.getElementById("courses-groups-field-"+ Csuffixes[k]);

        /*======== BUILDING COURSES COLUMNS ========*/

        if (column.checked === true) {
            Cquery.OPTIONS.COLUMNS.push("courses_"+ Csuffixes[k]);
        }
        if (column.checked === false) {
            Cquery.OPTIONS.COLUMNS.pop();
        }

        /*======== BUILDING COURSES GROUPS (under TRANSFORMATIONS) ========*/

        if (group.checked === true) {

            if (!Cquery.TRANSFORMATIONS) {
                Cquery.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
            }
            Cquery.TRANSFORMATIONS.GROUP.push("courses_" + Csuffixes[k]);
        }
    }

    for (var l = 0; l < Rsuffixes.length; l++) {

        var column = document.getElementById("rooms-columns-field-"+ Rsuffixes[l]);
        var group = document.getElementById("rooms-groups-field-"+ Rsuffixes[l]);

        /*======== BUILDING ROOMS COLUMNS ========*/

        if (column.checked === true) {
            Rquery.OPTIONS.COLUMNS.push("rooms_"+ Rsuffixes[l]);
        }
        if (column.checked === false) {
            Rquery.OPTIONS.COLUMNS.pop();
        }

        /*======== BUILDING ROOMS GROUPS (under TRANSFORMATIONS) ========*/

        if (group.checked === true) {

            if (!Rquery.TRANSFORMATIONS) {
                Rquery.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
            }
            Rquery.TRANSFORMATIONS.GROUP.push("rooms_" + Rsuffixes[l]);
        }
    }

    /*======== BUILDING APPLY (under TRANSFORMATIONS) *all Cquery* ========*/

    var tforms = document.getElementsByClassName("control-group transformation");

    if (tforms[0]) {
        if (!Cquery.TRANSFORMATIONS) {
            Cquery.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
        } else {
            Cquery.TRANSFORMATIONS.APPLY = [];
        }
    }

    for (var tform of tforms) {
        if (tform && Cquery.TRANSFORMATIONS) {

            var objA = {};
            var innerobjA = {};
            var key = "";

            // console.log(tform.children[0].querySelector("input").value);
            // console.log(tform.children[1].querySelector("select").children);
            // console.log(tform.children[2].querySelector("select").children);

            for (var option of tform.children[1].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    key = option.value;
                    console.log(key);
                }
            }

            for (var option of tform.children[2].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    console.log("INSIDE HERE");
                    console.log(document.getElementsByClassName("nav-item tab active")[0].innerText);
                    /* CASE FOR ROOMS */
                    if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {
                        innerobjA[key] = "rooms_" + option.value;
                    } else {
                        innerobjA[key] = "courses_" + option.value;
                    }
                }
            }

            /* When the transformation key name is duplicate, should both be pushed? */
            var key = tform.children[0].querySelector("input").value;
            objA[key] = innerobjA;

            // TEMPORARY AND RUSHED PUSHING OF TRANSFORMATION KEY TO COLUMN
            Cquery.OPTIONS.COLUMNS.push(key); // move down
            /* var boxes = document.querySelector("div.control.transformation input[data-key='" + key + "']");
            for (var box in boxes) {
                if (box.checked) {
                    query.OPTIONS.COLUMNS.push(key);
                }
            } */
            Cquery.TRANSFORMATIONS.APPLY.push(objA);
        }
    }

    /*======== BUILDING ORDER ========*/

    var div = document.getElementsByClassName("control order fields");
    var rawFields = div[0].children[0].children;
    if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {
        rawFields = div[1].children[0].children;
    }
    var fields = [].slice.call(rawFields);

    for (var i = 0; i < fields.length; i++) {

        /* When multiple keys are selected, which key should we order by? */
        if (fields[i].selected === true) {

            if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Courses") {
                console.log(fields);
                    Cquery.OPTIONS.ORDER = {"dir": "UP", "keys": []};
                    console.log(fields[i].value);
                        // fields.splice(fields[i], fields[i + 1]);
                        Cquery.OPTIONS.ORDER.keys.push("courses_" + fields[i].value);

                        if (document.getElementById("courses-order").checked === true) {
                            Cquery.OPTIONS.ORDER.dir = "DOWN";
                        }
                    }
            else if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {
                // console.log(fields);
                // console.log(i);
                // console.log(fields[i]);
                // console.log(fields[i].value);
                // console.log(fields[i].selected);
                if (fields[i].selected === true) {
                    Rquery.OPTIONS.ORDER = {"dir": "UP", "keys": []};
                    Rquery.OPTIONS.ORDER.keys.push("rooms_" + fields[i].value);

                    if (document.getElementById("rooms-order").checked === true) {
                        Rquery.OPTIONS.ORDER.dir = "DOWN";
                    }
                }
            }
            }
        }


    /*======== START BUILDING CONDITIONS ========*/

    var rawConditions = document.getElementsByClassName("control-group condition");
    var onditions = [].slice.call(rawConditions);
    console.log(onditions);
    console.log(onditions[0]);

    var Rconditions = [];
    var conditions = [];
    for (var j = 0; j < onditions.length; j++) {
        if (/*onditions[j].textContent === "\n    \n        \n        Not\n    \n    \n        \n                    \n" +
            "                        Address\n                                    \n" +
            "                        Full Name\n                                    \n                        " +
            "Furniture\n                                    \n                        Link\n" +
            "                                    \n                        Latitude\n" +
            "                                    \n                        Longitude\n" +
            "                                    \n                        Name\n" +
            "                                    \n                        Number\n" +
            "                                    \n                        Seats\n" +
            "                                    \n                        Short Name\n" +
            "                                    \n                        Type\n" +
            "                        \n    \n    \n        \n                    \n" +
            "                        EQ\n                                    \n                        GT\n" +
            "                                    \n                        IS\n" +
            "                                    \n                        LT\n" +
            "                        \n    \n    \n        \n        \n"*/onditions[j].children[1].children[0][0].value
        === "audit") {
            conditions.push(onditions[j]);
            // conditions.pop();
        } else {
            Rconditions.push(onditions[j]);
        }
    }
    if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {
        CampusExplorer.buildRConditions(Rconditions);
    } else {
        CampusExplorer.buildConditions(conditions);
    }
    console.log("CHECK HERE");
    console.log(Rconditions);
    console.log(conditions);

    // var Rprefix = "rooms_";

    // if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {


        /* for (var j = 0; j < conditions.length; j++) {
            // if (conditions[j].children[1].querySelector("select").children[0]);
            const keys = conditions[j].children[1].querySelector("select").children;
            for (var key of keys) {
                if (key.value === "audit" || key.value === "avg" || key.value === "dept") {
                    conditions.splice(j, j+1);
                }
            }
        } */
    // }

    console.log(Rquery);
    console.log(Cquery);
    if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {
        return Rquery;
    } else {
        return Cquery;
    }
};

/* CampusExplorer.buildQueryHelper(var label) = function() {
    switch (label) {
        case "Audit":
            label = "next";
            break;
        case "JHey":
            break;
        default:
    }
}; */

CampusExplorer.buildConditions = function(conditions) {
    var prefix = "courses_";
    if (conditions.length > 1) {
        /* Include logic array */
        var word = "";

        if (document.getElementById("courses-conditiontype-all").checked) {
            Cquery.WHERE["AND"] = [];
            word = "AND";
        } else if (document.getElementById("courses-conditiontype-any").checked) {
            Cquery.WHERE["OR"] = [];
            word = "OR";
        } else {
            Cquery.WHERE["NOT"] = {"OR": []};
            word = "NOT";
        }

        for (var condition of conditions) {

            // CampusExplorer.buildCondition(condition);
            var obj = {};
            var innerobj = {};
            var comp = "";

            for (var option of condition.children[1].querySelector("select").children) {

                var raw = condition.children[3].querySelector("input").value;
                var numeric = parseInt(raw);

                if (option.getAttribute("selected")) {
                    if (numeric !== numeric || comp === "IS") {
                        innerobj[prefix + option.value] = raw;
                    } else {
                        innerobj[prefix + option.value] = numeric;
                    }
                }
            }

            for (var option of condition.children[2].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    obj[option.value] = innerobj;
                    console.log(obj);
                    comp = option.value;
                }
            }

            /* push to array with logic */
            if (word === "NOT") {
                if (condition.children[0].querySelector("input").checked) {
                    Cquery.WHERE[word].OR.push({"NOT": obj});
                } else {
                    Cquery.WHERE[word].OR.push(obj);
                }
            } else {
                if (condition.children[0].querySelector("input").checked) {
                    Cquery.WHERE[word].push({"NOT": obj});
                } else {
                    Cquery.WHERE[word].push(obj);
                }
            }
        }
    } else if (conditions !== undefined) {
        /* lone query condition */
        var condition = conditions[0];

        if (condition) {
            // CampusExplorer.buildCondition(condition);
            var obj = {};
            var innerobj = {};
            var comp = "";

            for (var option of condition.children[1].querySelector("select").children) {

                var raw = condition.children[3].querySelector("input").value;
                var numeric = parseInt(raw);

                if (option.getAttribute("selected")) {
                    if (numeric !== numeric || comp === "IS") {
                        innerobj[prefix + option.value] = raw;
                    } else {
                        innerobj[prefix + option.value] = numeric;
                    }
                }
            }

            for (var option of condition.children[2].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    obj[option.value] = innerobj;
                    console.log(obj);
                    comp = option.value;
                }
            }
            /* no preceding logic */
            if (condition.children[0].querySelector("input").checked) {
                Cquery.WHERE = {"NOT": obj};
            } else {
                Cquery.WHERE = obj;
            }
        }
    }
};

CampusExplorer.buildRConditions = function(conditions) {
    var prefix = "rooms_";
    if (conditions.length > 1) {
        /* Include logic array */
        var word = "";

        if (document.getElementById("courses-conditiontype-all").checked) {
            Rquery.WHERE["AND"] = [];
            word = "AND";
        } else if (document.getElementById("courses-conditiontype-any").checked) {
            Rquery.WHERE["OR"] = [];
            word = "OR";
        } else {
            Rquery.WHERE["NOT"] = {"OR": []};
            word = "NOT";
        }

        for (var condition of conditions) {

            // CampusExplorer.buildCondition(condition);
            var obj = {};
            var innerobj = {};
            var comp = "";

            for (var option of condition.children[1].querySelector("select").children) {

                var raw = condition.children[3].querySelector("input").value;
                var numeric = parseInt(raw);

                if (option.getAttribute("selected")) {
                    if (numeric !== numeric || comp === "IS") {
                        innerobj[prefix + option.value] = raw;
                    } else {
                        innerobj[prefix + option.value] = numeric;
                    }
                }
            }

            for (var option of condition.children[2].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    obj[option.value] = innerobj;
                    console.log(obj);
                    comp = option.value;
                }
            }

            /* push to array with logic */
            if (word === "NOT") {
                if (condition.children[0].querySelector("input").checked) {
                    Rquery.WHERE[word].OR.push({"NOT": obj});
                } else {
                    Rquery.WHERE[word].OR.push(obj);
                }
            } else {
                if (condition.children[0].querySelector("input").checked) {
                    Rquery.WHERE[word].push({"NOT": obj});
                } else {
                    Rquery.WHERE[word].push(obj);
                }
            }
        }
    } else if (conditions !== undefined) {
        /* lone query condition */
        var condition = conditions[0];

        if (condition) {
            // CampusExplorer.buildCondition(condition);
            var obj = {};
            var innerobj = {};
            var comp = "";

            for (var option of condition.children[1].querySelector("select").children) {

                var raw = condition.children[3].querySelector("input").value;
                var numeric = parseInt(raw);

                if (option.getAttribute("selected")) {
                    if (numeric !== numeric || comp === "IS") {
                        innerobj[prefix + option.value] = raw;
                    } else {
                        innerobj[prefix + option.value] = numeric;
                    }
                }
            }

            for (var option of condition.children[2].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    obj[option.value] = innerobj;
                    console.log(obj);
                    comp = option.value;
                }
            }
            /* no preceding logic */
            if (condition.children[0].querySelector("input").checked) {
                Rquery.WHERE = {"NOT": obj};
            } else {
                Rquery.WHERE = obj;
            }
        }
    }
};

/* let radios = ["any", "all", "none"];

 for (var radio of radios) {
     if (document.getElementById("courses-conditiontype-" + radio).checked && ) {
         query.WHERE[]
     }
 } */
// CampusExplorer.

/*var columns = document.getElementsByTagName("input")

    console.log(columns);
    console.log(columns[0]);
    for (var input in columns) {
        if (input.checked === "checked") {

        }
        // CampusExplorer.buildQueryHelper(item.label);
    }
    console.log("CampusExplorer.buildQuery not implemented yet.");
    console.log(options);
    console.log(options[0]);*/


