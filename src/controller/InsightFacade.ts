import Log from "../Util";
import DataController, {IDataset} from "./DataController";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";
import QueryController from "./QueryController";

// import fs = require('fs');

/**
 * This is the main programmatic entry point for the project.
 * Takes the result from DataController and forms UI response
 * In terms of algorithm speed, the most important part will be saving data to disk
 * Going to end up being a server: when someone calls addDataset() instead of just having it
 * available in RAM, we need to save it to disk as a file.
 * Merge all the JSONs and store as 1 file like
 * datasets: [
 *  {all the data from courses.zip}
 *  {all the data from courses2.zip}
 *  ...
 * ]
 * or 1 file/dataset
 */
export default class InsightFacade implements IInsightFacade {
    private static controller = new DataController();

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
       return new Promise(function (fulfill, reject) {
           InsightFacade.controller.addDataset(id, content, kind).then(function (result: boolean) {
               Log.trace("finalfulfill");
               fulfill({code: 204, body: {result: ""}});
           }).catch(function (err: Error) {
               reject({code: 400, error: "blah"});
               Log.trace("finalreject");
           });
       });
     }

    public removeDataset(id: string): Promise<InsightResponse> {
        return new Promise(function (fulfill, reject) {
            InsightFacade.controller.removeDataset(id).then(function (result: boolean) {
                Log.trace("finalfulfill");
                fulfill({code: 204, body: {result: ""}});
            }).catch(function (err: Error) {
                reject({code: 404, error: "Could not find zip file"});
                Log.trace("finalreject");
            });
        });
    }

    public performQuery(query: any): Promise <InsightResponse> {
        const controller: QueryController = new QueryController(InsightFacade.controller.getDatasets());
        return new Promise(function (fulfill, reject) {
            // TODO: build what should go in the result response body
            if (controller.isValidQuery(query)) {
                fulfill({code: 200, body: {result: "sent in JSON according in the response body"}});
            } else {
                reject({code: 400, error: "Invalid query format (check that there is a WHERE and an OPTIONS"});
            }
        });
    }

    public listDatasets(): Promise<InsightResponse> {
        return new Promise(function (fulfill) {
            const datasets: IDataset[] = InsightFacade.controller.getDatasets();
            const result: InsightDataset[] = [];
            for (const dataset of datasets) {
                result.push(dataset["metadata"]);
            }
            fulfill({code: 200, body: {result}});
        });
    }
}
