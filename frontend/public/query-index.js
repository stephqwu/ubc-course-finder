/**
 * This hooks together all the CampusExplorer methods and binds them to clicks on the submit button in the UI.
 *
 * The sequence is as follows:
 * 1.) Click on submit button in the reference UI
 * 2.) Query object is extracted from UI using global document object (CampusExplorer.buildQuery)
 * 3.) Query object is sent to the POST /query endpoint using global XMLHttpRequest object (CampusExplorer.sendQuery)
 * 4.) Result is rendered in the reference UI by calling CampusExplorer.renderResult with the response from the endpoint as argument
 */

// TODO: implement!

var button = document.getElementById("submit-button");
button.addEventListener("click", function () {

    // var string;
    async function stuff() {
        await CampusExplorer.sendQuery(CampusExplorer.buildQuery());
        // console.log(string);
    }
    var string = stuff().then(function () {
        // console.log(value);
        // console.log("STRING: " + string);
        // console.log(string);
        // console.log(value);
        // var obj = JSON.parse(string);
        console.log("OBJECT: " + string);
        console.log(string);
        CampusExplorer.renderResult(string);
    });
    //var string = CampusExplorer.buildQuery();
    //var obj = JSON.parse(string);
    //CampusExplorer.sendQuery(obj);

    /* CampusExplorer.sendQuery(CampusExplorer.buildQuery()).then(function (value) {
        console.log(value);
        // var obj = JSON.parse(value);
        CampusExplorer.renderResult(value);
    }) */
});
