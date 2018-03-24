/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */

CampusExplorer.sendQuery = function(query) {

    return new Promise(function(fulfill, reject) {

        console.log(query);

        try {
            var request = new XMLHttpRequest();

            request.onload = function () {

                var result = request.response;
                console.log(result);

                if (result.code === 200) {
                    fulfill(result.body)
                } else {
                    reject(result.body)
                }

            };

            request.open("POST", "/query");
            request.send(query);
            console.log(query);

            // console.log("CampusExplorer.sendQuery not implemented yet.");

        } catch (err) {
            console.log(err);
            console.log(query);
            reject(err);
        }

    });
};
