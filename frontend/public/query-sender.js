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
            request = new XMLHttpRequest();

            /* request.onload = function () {

                var result = request.response;
                console.log(result);

                if (result.code === 200) {
                    fulfill(result.body)
                } else {
                    reject(result.body)
                }

            }; */

            request.open("POST", "/query", true);
            request.setRequestHeader("content-type", "application/json");
            request.onreadystatechange = function () {

                var result = request.response;

                if (request.readyState == 4 && request.status == 200) {
                    fulfill(result.body);
                } else {
                    reject(result.body);
                }

                console.log(result);

                /*var result = request.response;
                // var json = JSON.parse(result);
                // console.log(json);
                console.log(result);

                if (result.code == 200) {
                    fulfill(result.body)
                } else {
                    reject(result.body)
                }*/
            };
            var data = JSON.stringify(query);
            //var json = JSON.parse(query);
            // console.log(query.toString());
            request.send(data);
            // console.log(data);

            // console.log("CampusExplorer.sendQuery not implemented yet.");

        } catch (err) {
            console.log(err);
            console.log(query);
            reject(err);
        }

    });
};
