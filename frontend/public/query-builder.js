/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    let query = {"WHERE": {}, "OPTIONS": {"COLUMNS": [], "ORDER": {"dir": "UP", "keys": []}}, "TRANSFORMATIONS": {"GROUP": []}};
    // query.OPTIONS = {COLUMNS: []};
    // TODO: implement!
    let suffixes = ["audit", "avg", "dept", "fail", "id", "instructor", "pass", "title", "uuid", "year"];
    for (var i = 0; i < suffixes.length; i++) {
        var column = document.getElementById("courses-columns-field-"+ suffixes[i]);
        var group = document.getElementById("courses-groups-field-"+ suffixes[i]);
        if (column.checked === true) {
            query.OPTIONS.COLUMNS.push("courses_"+ suffixes[i]);
        }
        if (group.checked === true) {
            query.TRANSFORMATIONS.GROUP.push("courses_" + suffixes[i]);
        }
    }
    var options = document.getElementsByTagName("option");
    for (var i = 0; i < options.length; i++) {
        if (options[i].selected === true) {
            query.OPTIONS.ORDER.keys.push("courses_" + options[i].value);
        }
    }
    if (document.getElementById("courses-order").checked === true) {
        query.OPTIONS.ORDER.dir = "DOWN";
    }
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

// CampusExplorer.
