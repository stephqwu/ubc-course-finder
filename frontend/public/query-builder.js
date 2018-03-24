/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {

    let query = {"WHERE": {}, "OPTIONS": {"COLUMNS": []}};
    let suffixes = ["audit", "avg", "dept", "fail", "id", "instructor", "pass", "title", "uuid", "year"];

    for (var i = 0; i < suffixes.length; i++) {

        var column = document.getElementById("courses-columns-field-"+ suffixes[i]);
        var group = document.getElementById("courses-groups-field-"+ suffixes[i]);

        /*======== BUILDING COLUMNS ========*/

        if (column.checked === true) {
            query.OPTIONS.COLUMNS.push("courses_"+ suffixes[i]);
        }

        /*======== BUILDING GROUPS (under TRANSFORMATIONS) ========*/

        if (group.checked === true) {
            query.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
            query.TRANSFORMATIONS.GROUP.push("courses_" + suffixes[i]);
        }
    }

    /*======== BUILDING APPLY (under TRANSFORMATIONS) ========*/

    var tforms = document.getElementsByClassName("control-group transformation");

    for (var tform of tforms) {
        if (tform) {
             query.TRANSFORMATIONS = {"GROUP": [], "APPLY": []};
        }
        var obj = {};
        var innerobj = {};
        var key = "";

        console.log(tform.children[0].querySelector("input").value);
        console.log(tform.children[1].querySelector("select").children);
        console.log(tform.children[2].querySelector("select").children);

        for (var option of tform.children[1].querySelector("select").children) {

            if (option.getAttribute("selected")) {
                key = option.value;
                console.log(key);
            }
        }

        for (var option of tform.children[2].querySelector("select").children) {

            if (option.getAttribute("selected")) {
                innerobj[key] = "courses_" + option.value;
            }
        }
        obj[tform.children[0].querySelector("input").value] = innerobj;
        query.TRANSFORMATIONS.APPLY.push(obj);
    }

    /*======== BUILDING ORDER ========*/

    var div = document.getElementsByClassName("control order fields");
    var fields = div[0].children[0].children;

    for (var field of fields) {

        /* When multiple keys are selected, which key should we order by? */
        if (field.selected === true) {
            query.OPTIONS.ORDER = {"dir": "UP", "keys": []};
            query.OPTIONS.ORDER.keys.push("courses_" + field.value);
        }
    }

    if (document.getElementById("courses-order").checked === true) {
        query.OPTIONS.ORDER.dir = "DOWN";
    }

    /*======== START BUILDING CONDITIONS ========*/

    var conditions = document.getElementsByClassName("control-group condition");
    console.log(conditions);

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

            // console.log("NEW CONDITION: " + condition);
            // console.log("CONDITION.CHILDREN: " + condition.children);
            // console.log("OPTION CHILD: " + condition.children[2].querySelector("option"));
            // console.log(condition.children[2].querySelector("select"));

            var obj = {};
            var innerobj = {};
            var comp = "";

            for (var option of condition.children[1].querySelector("select").children) {

                var raw = condition.children[3].querySelector("input").value;
                var numeric = parseInt(raw);

                if (option.getAttribute("selected")) {
                    if (numeric !== numeric || comp === "IS") {
                        innerobj["courses_" + option.value] = raw;
                    } else {
                        innerobj["courses_" + option.value] = numeric;
                    }
                }
            }

            for (var option of condition.children[2].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    obj[option.value] = innerobj;
                    comp = option.value;
                }
            }
            /* push with logic */
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
        var obj = {};
        var innerobj = {};
        var comp = "";

        if (condition) {
            for (var option of condition.children[1].querySelector("select").children) {

                var raw = condition.children[3].querySelector("input").value;
                var numeric = parseFloat(raw);

                if (option.getAttribute("selected")) {
                    if (numeric !== numeric || comp === "IS") {
                        innerobj["courses_" + option.value] = raw;
                    } else {
                        innerobj["courses_" + option.value] = numeric;
                    }
                }
            }

            for (var option of condition.children[2].querySelector("select").children) {

                if (option.getAttribute("selected")) {
                    obj[option.value] = innerobj;
                    comp = option.value;
                }
            }

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


