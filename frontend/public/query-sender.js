/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */

import {InsightResponse} from "../controller/IInsightFacade";



CampusExplorer.sendQuery = function(query) {

    return new Promise(function(fulfill, reject) {


        var request = new XMLHttpRequest();

        request.onload = function() {

            var result = request.response;

            console.log(result);

            if (result.code === 200) {
                fulfill(result.body)
            } else {
                reject(result.body)
            }

        };

        request.open("POST", "http://localhost:4321/query");
        request.send(query);

        console.log("CampusExplorer.sendQuery not implemented yet.");

    });
};
