import fs = require("fs");
import JSZip = require("jszip");
import {JSZipObject} from "jszip";
import path = require("path");
import * as parse5 from "../../node_modules/parse5/lib/index";
import Log from "../Util";

import {InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";

const dataFolder = "./data";

export interface IDataset {
    metadata: InsightDataset;
    data: JSON[];
}

export default class DataController {
    private datasets: IDataset[];
    // private files: any[];
    private trees: any[];

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

    public parseRooms(id: string, content: string): Promise<boolean> {

        // this.files = new Array();
        this.trees = new Array();

        return new Promise (function (fulfill, reject) {
            const currZip = new JSZip();
            const files: any = new Array();
            currZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {

                zip.forEach(function (relativePath: string, file: JSZipObject) {
                    if (!file.dir && !file.name.includes(".DS_Store") && file.name !== "index.htm") {
                        Log.trace(file.name);
                        files.push(file.async("text"));
                    }
                    // Log.trace(this.files);
                    Log.trace(files);
                });
                // this.files = files;
                const buildingFile = files[0];
                // Log.trace(buildingFile);
                try {
                    const tree = parse5.parse(buildingFile.toString()) as parse5.AST.Default.Document;
                    // Log.trace(tree.toString());
                    this.trees.push(tree.childNodes[1].nodeName);
                    Log.trace(tree.childNodes[1].nodeName);
                    fulfill(true);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    // public parseRooms(id: string, content: string): any {
        /*let buildingFile;
        const trees = new Array();
        for (const file in this.files) {
            buildingFile = this.extractBuildingFiles(id, content);
            Log.trace(buildingFile);
            const tree = parse5.parse(file) as parse5.AST.Default.Document;
            trees.push(tree);
        }
        return trees;
        */

    // }

    public locateBuilding(addr: string) {
        return;
    }

    // This method adds a new dataset with specified id and content. The content is a base64 string that we need
    // to deserialize using JSZip. The addDataset() method of InsightFacade should make use of this method.

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<boolean> {
        // JS objects passed as queries, not JSON string (already parsed)
        // Check JS object for validity, rather than validating JSON string/file
        if (kind === InsightDatasetKind.Rooms) {
            this.parseRooms(id, content);
        } else {

            const curr = this;

            return new Promise(function (fulfill, reject) {

                // If a dataset with the same ID already exists, we reject
                for (const dataset of curr.datasets) {
                    if (dataset["metadata"]["id"] === id) {
                        reject(false);
                    }
                }

                const currZip = new JSZip();

                if (id === null) { // what if id is a key that does not exist in datasetsToLoad? (InsightFacade.spec.ts)
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
                    // Once all promises have resolved, we iterate through the contents of each file and add to the
                    // current dataset.

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

                            const internalData = {
                                metadata: {id, kind: InsightDatasetKind.Courses, numRows},
                                data: jsons,
                            };
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
