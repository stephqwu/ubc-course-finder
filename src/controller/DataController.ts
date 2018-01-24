import JSZip = require("jszip");
import {JSZipObject} from "jszip";
import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import Log from "../Util";
const dataFolder = "./";

export interface IDataset {
    metadata: InsightDataset;
    data: JSON[];
}

export default class DataController {
    private datasets: IDataset[];

    constructor() {
        this.datasets = new Array();
        // TODO:
        // add 10 datasets, datasets length would be 10
        // each object within the array has a list of JSON which is just the contents of each file in the zip folder
    }

    // This method adds a new dataset with specified id and content. The content is a base64 string that we need
    // to deserialize using JSZip. The addDataset() method of InsightFacade should make use of this method.

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<boolean> {
        // JS objects passed as queries, not JSON string (already parsed)
        // Check JS object for validity, rather than validating JSON string/file
        const fs = require("fs");
        const curr = this;
        return new Promise(function (fulfill, reject) {
            const currZip = new JSZip();

            currZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {
                const jsons: JSON[] = new Array();
                const promises: Array<Promise<string>> = new Array();
                let numRows: number = 0;
                zip.forEach(function (relativePath: string, file: JSZipObject) {
                    try {
                        if (!file.dir) {
                            // If the current file is not a directory, add to Promise array
                            promises.push(file.async("text"));
                        }
                    } catch (err) {
                        reject(err);
                    }
                });
                // Once all promises have resolved, we iterate through the contents of each file and add to the current
                // dataset.
                Promise.all(promises).then(function (datas: string[]) {
                    datas.forEach(function (data: string) {
                        const json = JSON.parse(data);
                        jsons.push(json);
                        numRows += json["result"].length;
                    });
                    if (numRows > 0) {
                        curr.datasets.push({metadata: {id, kind: InsightDatasetKind.Courses, numRows}, data: jsons});
                        fs.writeFile("/test/data", jsons, function (err: any) {
                            if (err) {
                                Log.trace(err);
                                reject(err);
                            } else {
                                Log.trace("add was successful!");
                                fulfill(true);
                            }
                            // TODO: we've read all the files in the zip folder, so we should the data to disk
                            // InsightFacade.controller.addDataset(id, content, kind).then(function (result: boolean) {
                            // Promise<InsightResponse>)) {
                            // form the JSON response based on what the method returns

                            /*const handleJSONFile = function (err: any, data: any) {
                                if (err) {
                                    throw err;
                                }
                                // response = JSON.parse(data);
                                // Read the file, and pass it to your callback (move to outside/below block end?)
                                fs.readFile("./response.json", handleJSONFile);
                            };*/
                            // TODO: represent an IDataset object as a single string for caching.
                        });
                    }
                });
            });
        });
    }
    // TODO: we should implement delete and listing in this class as well
}
