import fs = require("fs");
import JSZip = require("jszip");
import {JSZipObject} from "jszip";
import * as parse5 from "parse5";
import path = require("path");
import Log from "../Util";
import {InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";

const dataFolder = "./data";

export interface IDataset {
    metadata: InsightDataset;
    data: JSON[];
}

export default class DataController {
    private datasets: IDataset[];

    constructor() {
        this.datasets = new Array();
        // If any data files exist on disk, load datasets from those files
        const curr = this;
        if (fs.existsSync(dataFolder)) {
            fs.readdirSync(dataFolder).forEach(function (file, index) {
                try {
                    curr.datasets.push(JSON.parse(fs.readFileSync(path.join(dataFolder, file), "utf-8")));
                } catch (err) {
                    Log.trace(err);
                }
            });
        }
    }

    public parseRooms(id: string, content: string, kind: InsightDatasetKind): any {
        const isThisTheTree = parse5.parse("<div></div>") as parse5.AST.Default.Document;
        return isThisTheTree;
    }

    public locateBuilding(addr: string) {
        return;
    }

    // This method adds a new dataset with specified id and content. The content is a base64 string that we need
    // to deserialize using JSZip. The addDataset() method of InsightFacade should make use of this method.

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<boolean> {
        // JS objects passed as queries, not JSON string (already parsed)
        // Check JS object for validity, rather than validating JSON string/file

        const curr = this;

        return new Promise(function (fulfill, reject) {

            // If a dataset with the same ID already exists, we reject
            for (const dataset of curr.datasets) {
                if (dataset["metadata"]["id"] === id) {
                    reject(false);
                }
            }

            const currZip = new JSZip();

            if (id === null) {     // what if id is a key that does not exist in datasetsToLoad? (InsightFacade.spec.ts)
                reject(false);
                return;
            }

            currZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {

                const jsons: JSON[] = new Array();
                const promises: Array<Promise<string>> = new Array();

                let numRows: number = 0;

                zip.forEach(function (relativePath: string, file: JSZipObject) {
                    if (!file.dir) {
                        // If the current file is not a directory, add to Promise array
                        if (file.name.indexOf("courses") >= 0) {
                            promises.push(file.async("text"));
                        } else {
                            reject();
                        }
                    }
                });
                // Once all promises have resolved, we iterate through the contents of each file and add to the current
                // dataset.

                Promise.all(promises).then(function (datas: string[]) {

                    datas.forEach(function (data: string) {
                        try {
                            const json = JSON.parse(data);
                            jsons.push(json);
                            numRows += json["result"].length;
                        } catch (err) {
                            reject(err);
                        }
                    });

                    if (numRows > 0) {

                        const internalData = {metadata: {id, kind: InsightDatasetKind.Courses, numRows}, data: jsons};
                        curr.datasets.push(internalData);
                        if (!fs.existsSync(dataFolder)) {
                            fs.mkdirSync(dataFolder);
                        }

                        fs.writeFile("./data/" + id + ".json", JSON.stringify(internalData), function (err: any) {
                            if (err) {
                                Log.trace(err);
                                reject(err);
                            } else {
                                Log.trace("add was successful!");
                                fulfill(true);
                            }
                        });

                    } else {
                        reject();
                    }
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    public removeDataset(id: string): Promise<boolean> {
        return new Promise(function (fulfill, reject) {
            try {
                fs.unlinkSync("./data/" + id + ".json");
                return fulfill();
            } catch (err) {
                return reject();
            }
        });
    }

    public getDatasets(): IDataset[] {
        return this.datasets;
    }
}
