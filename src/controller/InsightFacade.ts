import Log from "../Util";
import DataController from "./DataController";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {
    private static controller = new DataController();

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        // TODO: this isn't actually a working implementation, just wrote this part so I could debug DataController
        return new Promise(function (fulfill, reject) {
            InsightFacade.controller.addDataset(id, content, kind).then(function (result: boolean) {
                fulfill({code: 204, body: {result: ""}});
            }).catch(function (err: Error) {
                reject({code: 400, error: "blah"});
            });
        });
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }

    public performQuery(query: any): Promise <InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }

    public listDatasets(): Promise<InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }
}
