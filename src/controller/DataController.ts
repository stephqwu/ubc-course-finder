import fs = require("fs");
import JSZip = require("jszip");
import {JSZipObject} from "jszip";
import path = require("path");
import parse5 = require("parse5");
import Log from "../Util";

import {InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";
import {isNullOrUndefined} from "util";

const dataFolder = "./data";

export interface IDataset {
    metadata: InsightDataset;
    data: JSON[];
}

export default class DataController {
    private datasets: IDataset[];
    // private buildingNames: any[];
    private roomNames: any[];
    private rooms: any[];

    constructor() {
        this.datasets = new Array();
        this.roomNames = new Array();
        this.rooms = new Array();
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
                            // curr.parseBuildings(id, content, file);
                            if (!isNullOrUndefined(file)) {
                                const index = file;
                                index.async("text").then(function (data: any) {
                                    const tree: any = parse5.parse(data);
                                    curr.findRoomNames(tree, content);
                                    // TODO: Figure out why curr.roomNames is empty here
                                    Log.trace(curr.roomNames.length.toString());
                                }).catch(function (err: any) {
                                    reject(err);
                                });
                            }
                        /*} else if (!file.dir && !file.name.includes(".DS_Store")) {
                            curr.parseRooms(id, content, file); */
                        } else {
                            reject("Could not find an index.htm file");
                        }
                    });
                }).catch(function (err: any) {
                    reject(err);
                });
                fulfill("Hooray we add");
            } catch (err) {
                reject(err);
            }
        });
    }

    public findRoomNames(tree: any, content: string): any {
        const html = tree.childNodes[6];
        const body = html.childNodes[3];
        const tbody = this.findNode(body, "tbody");
        for (const tr of tbody.childNodes) {
                let tableRows: any;
                // Log.trace("In loop");
                if (tr.tagName === "tr") {
                    tableRows = tr.childNodes;
                    if (!isNullOrUndefined(tableRows)) {
                        // Log.trace("In inner");
                        let building;
                        for (const td of tableRows) {
                            // Log.trace("In inner loop");
                            if (!isNullOrUndefined(td.attrs)) {
                                // Log.trace("inner attrs");
                                let link;
                                if (td.attrs[0].value === "views-field views-field-field-building-code") {
                                    building = td.childNodes[0].value;
                                } else if (td.attrs[0].value === "views-field views-field-title") {
                                    link = td.childNodes[1].attrs[0].value;
                                    this.findBuildingRooms(building, link, content);
                                }
                            }
                        }
                    }
                }
                // TODO: Figure out why curr.roomNames is empty here
                // Log.trace(this.roomNames.length.toString());
        }
    }

    public findBuildingRooms(building: any, link: any, content: string): any {
        const curr = this;
        return new Promise(function (fulfill, reject) {
            const currZip = new JSZip();
            try {
                currZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {
                    zip.forEach(function (relativePath: string, file: JSZipObject) {
                        if ("./" + relativePath === link) {
                            if (!isNullOrUndefined(file)) {
                                const index = file;
                                index.async("text").then(function (data: any) {
                                        const tree: any = parse5.parse(data);
                                        const html = tree.childNodes[6];
                                        const body = html.childNodes[3];
                                        const tbody = curr.findNode(body, "tbody");
                                        let inner;
                                        const attr = "views-field views-field-field-room-number";
                                        for (const tr of tbody.childNodes) {
                                            if (tr.tagName === "tr" && tr !== null) {
                                                inner = tr.childNodes;
                                                if (!isNullOrUndefined(inner)) {
                                                    for (const td of inner) {
                                                        if (!isNullOrUndefined(td.attrs)) {
                                                            let room;
                                                            if (td.attrs[0].value === attr && td.childNodes[1] !== null
                                                                && td !== null) {
                                                                room = td.childNodes[1].childNodes[0].value;
                                                                curr.roomNames.push(building + room);
                                                                Log.trace(building + room);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            // TODO: Figure out why curr.roomNames is empty here
                                            // Log.trace(curr.roomNames.length.toString());
                                            // this.roomNames = curr.roomNames;
                                        }
                                }).catch(function (err: any) {
                                    reject(err);
                                });
                            }
                        }
                    });
                }).catch(function (err: any) {
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public findNode(node: any, tagName: string) { // attr: any, visited: boolean) {
            if (node.tagName === tagName) {
                return node;
            } else if (node.childNodes) {
                return this.findInChildren(node.childNodes, tagName);
            } else {
                return null;
            }
    }

    public findInChildren(nodes: any[], tagName: string) {
        for (const node of nodes) {
            const theNode: any = this.findNode(node, tagName);
            if (theNode !== null) {
                return theNode;
            }
        }
        return null;
    }

    public locateBuilding(addr: string): any {
        return;
    }

    // This method adds a new dataset with specified id and content. The content is a base64 string that we need
    // to deserialize using JSZip. The addDataset() method of InsightFacade should make use of this method.

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise <boolean> {
        // JS objects passed as queries, not JSON string (already parsed)
        // Check JS object for validity, rather than validating JSON string/file
        const curr = this;

        return new Promise(function (fulfill, reject) {
            if (kind === InsightDatasetKind.Rooms) {
                curr.parseRoomsDataset(id, content);
                const internalData = {
                    // TODO: Figure out why curr.roomNames is empty here
                    metadata: {id, kind: InsightDatasetKind.Rooms, numRows: curr.roomNames.length + 5},
                    data: "where's all the stuff",
                };
                if (!fs.existsSync(dataFolder)) {
                    fs.mkdirSync(dataFolder);
                }
                for (const room in curr.roomNames) {
                    internalData.data = room;
                    curr.rooms.push(internalData);
                }
                Log.trace(curr.rooms[5]);
                // TODO: Make added rooms data well-formed
                fs.writeFile("./data/" + id + ".json", JSON.stringify(internalData),
                    function (err: any) {
                        if (err) {
                            Log.trace(err);
                            reject(err);
                        } else {
                            // Log.trace("add was successful!");
                            fulfill(true);
                        }
                    });
            } else {

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
            }
        });
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
