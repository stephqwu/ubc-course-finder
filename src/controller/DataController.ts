import fs = require("fs");
import JSZip = require("jszip");
import {JSZipObject} from "jszip";
import path = require("path");
import parse5 = require("parse5");
import Log from "../Util";

import {InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";
import {isNullOrUndefined} from "util";

const dataFolder = "./data";
// const parse5 = require("parse5");

export interface IDataset {
    metadata: InsightDataset;
    data: JSON[];
}

export default class DataController {
    private datasets: IDataset[];
    // private files: any[];
    private trees: any[] = new Array();
    private buildingNames: any[];

    constructor() {
        this.datasets = new Array();
        // this.trees = new Array();
        this.buildingNames = new Array();
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

    public parseRoomsDataset(id: string, content: string): Promise<any> {
        const curr = this;
        return new Promise(function (fulfill, reject) {
            const currZip = new JSZip();
            try {
                currZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {
                    zip.forEach(function (relativePath: string, file: JSZipObject) {
                        if (file.name === "index.htm") {
                            curr.parseBuildings(id, content, file);
                       /* } else if (!file.dir && !file.name.includes(".DS_Store")) {
                            return this.parseRooms(id, content, file); */
                        } else {
                            reject("Could not find an index.htm file");
                        }
                    });
                });
                fulfill(this.trees);
            } catch (err) {
                reject(err);
            }
        });
    }

    public parseBuildings(id: string, content: string, file: any): Promise<any> {
        Log.trace("Inside parseBuildings");
        const curr = this;
        return new Promise ( function (fulfill, reject) {
           try {
               if (!isNullOrUndefined(file)) {
                   const index = file; // = JSZip().file(file)
                   Log.trace("INDEX: " + index);
                   // const indexFile = zip.file(index);
                   Log.trace(index.name);
                   index.async("text").then(function (data: any) {
                       Log.trace("Inside async");
                       const tree: any = parse5.parse(data);
                       Log.trace(tree.childNodes[6].tagName);
                       curr.findBuildingNames(tree);
                       curr.trees.push(tree);
                       fulfill(curr.trees);
                   }).catch(function (err: any) {
                           reject(err);
                   });
                   // Log.trace(tree.childNodes[1].nodeName);
                   // this.trees.push(tree);
               }
           } catch (err) {
               reject(err);
           }
        });
    }

    public findBuildingNames(tree: any): any {
        // TODO: Walk through file tree recursively and find/extract the building names (differentiated by <td> tags)
        // TODO: Make the parameter and return types more strict
    }

    public parseRooms(id: string, content: string, file: JSZipObject): Promise<any> {
        const curr = this;
        this.trees = new Array();
        const files: any = new Array();

        return new Promise (function (fulfill, reject) {

            Log.trace(file.name);
            files.push(file.async("text"));
            Log.trace(files);
            const buildingFile = files[0];
            // Log.trace(buildingFile);
            try {
                const tree: any = parse5.parse(buildingFile);
                this.trees.push(tree.childNodes[1].nodeName);
                Log.trace(tree.childNodes[1].nodeName);
                fulfill(tree);
            } catch (err) {
                reject(err);
            }
        });
    }

    public findRoomNames(tree: any): any {
        // TODO: Extract room names
        // TODO: Make the parameter and return types more strict
    }

    public locateBuilding(addr: string): any {
        return;
    }

    // This method adds a new dataset with specified id and content. The content is a base64 string that we need
    // to deserialize using JSZip. The addDataset() method of InsightFacade should make use of this method.

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise <boolean> {
        // JS objects passed as queries, not JSON string (already parsed)
        // Check JS object for validity, rather than validating JSON string/file
        if (kind === InsightDatasetKind.Rooms) {
            this.parseRoomsDataset(id, content);
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

    public removeDataset(id: string): Promise <boolean> {
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
