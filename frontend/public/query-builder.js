/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

CampusExplorer.buildQuery = function() {

    let query = {"WHERE": {}, "OPTIONS": {"COLUMNS": []}};
    let Csuffixes = ["audit", "avg", "dept", "fail", "id", "instructor", "pass", "title", "uuid", "year"];
    let Rsuffixes = ["address", "fullname", "furniture", "href", "lat", "lon", "name", "number", "seats", "shortname",
        "type"];

    for (var i = 0; i < Csuffixes.length; i++) {

        var column = document.getElementById("courses-columns-field-"+ Csuffixes[i]);
        var group = document.getElementById("courses-groups-field-"+ Csuffixes[i]);

        /*======== BUILDING COLUMNS ========*/

        if (column.checked === true) {
            query.OPTIONS.COLUMNS.push("courses_"+ Csuffixes[i]);
        }

        /*======== BUILDING GROUPS (under TRANSFORMATIONS) ========*/

        if (group.checked === true) {

            if (!query.TRANSFORMATIONS) {
                query.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
            }
            query.TRANSFORMATIONS.GROUP.push("courses_" + Csuffixes[i]);
        }
    }

    for (var i = 0; i < Rsuffixes.length; i++) {

        var column = document.getElementById("rooms-columns-field-"+ Rsuffixes[i]);
        var group = document.getElementById("rooms-groups-field-"+ Rsuffixes[i]);

        /*======== BUILDING COLUMNS ========*/

        if (column.checked === true) {
            query.OPTIONS.COLUMNS.push("rooms_"+ Rsuffixes[i]);
        }

        /*======== BUILDING GROUPS (under TRANSFORMATIONS) ========*/

        if (group.checked === true) {

            if (!query.TRANSFORMATIONS) {
                query.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
            }
            query.TRANSFORMATIONS.GROUP.push("rooms_" + Rsuffixes[i]);
        }
    }

    /*======== BUILDING APPLY (under TRANSFORMATIONS) ========*/

    var tforms = document.getElementsByClassName("control-group transformation");

    if (!query.TRANSFORMATIONS) {
        query.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
    } else {
        query.TRANSFORMATIONS.APPLY = [];
    }

    for (var tform of tforms) {
        if (tform) {

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
            query.OPTIONS.COLUMNS.push(key); // move down
            /* var boxes = document.querySelector("div.control.transformation input[data-key='" + key + "']");
            for (var box in boxes) {
                if (box.checked) {
                    query.OPTIONS.COLUMNS.push(key);
                }
            } */
            query.TRANSFORMATIONS.APPLY.push(objA);
        }
    }

    /*======== BUILDING ORDER ========*/

    var div = document.getElementsByClassName("control order fields");
    var fields = div[0].children[0].children;

    for (var field of fields) {

        /* When multiple keys are selected, which key should we order by? */
        if (field.selected === true) {
            query.OPTIONS.ORDER = {"dir": "UP", "keys": []};
            if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {
                query.OPTIONS.ORDER.keys.push("rooms_" + field.value);
            } else {
                query.OPTIONS.ORDER.keys.push("courses_" + field.value);
            }
        }
    }

    if (document.getElementById("courses-order").checked === true) {
        query.OPTIONS.ORDER.dir = "DOWN";
    }

    /*======== START BUILDING CONDITIONS ========*/

    var conditions = document.getElementsByClassName("control-group condition");
    console.log(conditions);
    var prefix = "courses_";

    if (document.getElementsByClassName("nav-item tab active")[0].innerText === "Rooms") {
        prefix = "rooms_";
        console.log(document.getElementsByClassName("nav-item tab active").value);
    }

    if (conditions.length > 1) {
        /* Include logic array */
        var word = "";

        if (document.getElementById("courses-conditiontype-all").checked) {
            query.WHERE["AND"] = [];
            word = "AND";
        } else if (document.getElementById("courses-conditiontype-any").checked) {
            query.WHERE["OR"] = [];
            word = "OR";
        } else {
            query.WHERE["NOT"] = {"OR": []};
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
            // console.log("NEW CONDITION: " + condition);
            // console.log("CONDITION.CHILDREN: " + condition.children);
            // console.log("OPTION CHILD: " + condition.children[2].querySelector("option"));
            // console.log(condition.children[2].querySelector("select"));

            /* push to array with logic */
            if (word === "NOT") {
                if (condition.children[0].querySelector("input").checked) {
                    query.WHERE[word].OR.push({"NOT": obj});
                } else {
                    query.WHERE[word].OR.push(obj);
                }
            } else {
                if (condition.children[0].querySelector("input").checked) {
                    query.WHERE[word].push({"NOT": obj});
                } else {
                    query.WHERE[word].push(obj);
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
                query.WHERE = {"NOT": obj};
            } else {
                query.WHERE = obj;
            }
        }
    }
    console.log(query);
    return query;
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

CampusExplorer.buildCondition = function(condition) {


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


