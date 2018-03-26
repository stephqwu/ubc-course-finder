import fs = require("fs");
import http = require("http");
import JSZip = require("jszip");
import {JSZipObject} from "jszip";
import path = require("path");
import parse5 = require("parse5");
import Log from "../Util";

import {InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";
import {isNullOrUndefined} from "util";

const dataFolder = "./data";
const roomsDataFolder = "./rooms";

export interface IDataset {
    metadata: InsightDataset;
    data: JSON[];
}

export interface IRoomDataset {
    metadata: InsightDataset;
    data: JSON[];
}

export default class DataController {
    private courseDatasets: IDataset[];
    private rooms: any[];
    private roomDatasets: IRoomDataset[];

    constructor() {
        this.courseDatasets = new Array();
        this.rooms = new Array();
        this.roomDatasets = new Array();
        const curr = this;
        if (fs.existsSync(dataFolder)) {
            fs.readdirSync(dataFolder).forEach(function (file, index) {
                try {
                    curr.courseDatasets.push(JSON.parse(fs.readFileSync(path.join(dataFolder, file), "utf-8")));
                } catch (err) {
                    Log.trace(err);
                }
            });
        }
        if (fs.existsSync(roomsDataFolder)) {
            fs.readdirSync(roomsDataFolder).forEach(function (file, index) {
                try {
                    curr.roomDatasets.push(JSON.parse(fs.readFileSync(path.join(roomsDataFolder, file),
                        "utf-8")));
                } catch (err) {
                    Log.trace(err);
                }
            });
        }
    }

    public parseRoomsDataset(id: string, content: string): Promise<any> {
        Log.trace("parseRoomsDataset called");
        const i = 0;
        // method to parse a rooms dataset
        const curr = this;
        return new Promise(function (fulfill, reject) {
            const currZip = new JSZip();
            const promises: Array<Promise<string>> = new Array();
            try {
                currZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {
                    let found = false;
                    zip.forEach(function (relativePath: string, file: JSZipObject) {

                        // finds the index.htm file with all the building names
                        if (file.name === "index.htm") {
                            found = true;
                            if (!isNullOrUndefined(file)) {
                                const index = file;
                                promises.push(index.async("text"));
                            }
                        }
                    });
                    if (!found) {
                        reject("no index.htm found");
                    }
                    Promise.all(promises).then(function (datas: any[]) {

                        const buildingInfoPromises: Array<Promise<any>> = new Array();
                        for (const data of datas) {
                            // parse the index.htm file to an AST
                            const tree: any = parse5.parse(data);

                            // helper to find info related to each building in the file
                            buildingInfoPromises.push(curr.findBuildingInfo(tree, content, i));
                            // curr.findBuildingInfo(tree, content, i).then(function () {
                            //     Log.trace("Returning from findBuildingInfo");
                            // });
                        }
                        Promise.all(buildingInfoPromises).then(function () {
                            fulfill();
                        });
                    });
                }).catch(function (err: any) {
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public findBuildingInfo(tree: any, content: string, i: number): any {
        // helper to find info related to each building in the file
        const curr = this;
        return new Promise(function (fulfill, reject) {
            const html = tree.childNodes[6];
            const body = html.childNodes[3];

            // helper to find and return node with specific tag
            const tbody = curr.findNode(body, "tbody");
            const promises: Array<Promise<any>> = new Array();
            // gets each building's buildingCode, addr, buildingName, and links to rooms
            for (const tr of tbody.childNodes) {
                let tableRows: any;
                if (tr.tagName === "tr") {
                    tableRows = tr.childNodes;
                    if (!isNullOrUndefined(tableRows)) {
                        let buildingCode;
                        let addr;
                        let link;
                        let buildingName;
                        for (const td of tableRows) {
                            if (!isNullOrUndefined(td.attrs)) {
                                if (td.attrs[0].value === "views-field views-field-field-building-code") {
                                    buildingCode = td.childNodes[0].value.trim();
                                } else if (td.attrs[0].value === "views-field views-field-field-building-address") {
                                    addr = td.childNodes[0].value.trim();
                                } else if (td.attrs[0].value === "views-field views-field-title") {
                                    link = td.childNodes[1].attrs[0].value;
                                    buildingName = td.childNodes[1].childNodes[0].value.trim();
                                }
                            }
                        }
                        // helper to find each building's rooms and each room's details
                        promises.push(curr.findBuildingRoomsAndInfo(buildingCode, buildingName, addr, link, content, i,
                        ));
                    }
                }
            }
            Promise.all(promises).then(function () {
                fulfill();
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    public createRoomObject(buildingCode: string, buildingName: string, roomNumber: string, roomName: any, addr: any,
                            lat: any, lon: any, seats: any, type: any, furniture: any, href: any): any {
        const obj = {
            fullname: "",
            shortname: "",
            number: "",
            name: "",
            address: "",
            lat: 0,
            lon: 0,
            seats: 0,
            type: "",
            furniture: "",
            href: "",
        };
        obj.fullname = buildingName;
        obj.shortname = buildingCode;
        obj.number = roomNumber;
        obj.name = roomName;
        obj.address = addr;
        obj.lat = lat;
        obj.lon = lon;
        obj.seats = Number(seats);
        obj.type = type;
        obj.furniture = furniture;
        obj.href = href;
        return obj;
    }

    public findBuildingRoomsAndInfo(buildingCode: any, buildingName: any, addr: any, link: any, content: string,
                                    i: number): any {
        // method to find each building's rooms and each room's details
        const curr = this;
        return new Promise(function (fulfill, reject) {
            const currZip = new JSZip();
            currZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {
                const promises: Array<Promise<any>> = new Array();
                zip.forEach(function (relativePath: string, file: JSZipObject) {

                    // goes to each room file from links in index.htm
                    if ("./" + relativePath === link) {
                        if (!isNullOrUndefined(file)) {
                            const index = file;
                            promises.push(index.async("text"));
                        }
                    }
                });
                let lat: any;
                let lon: any;

                /*async function pleaseWork() {
                    const result = await curr.getGeoResponse(addr);
                    lat = result.lat;
                    lon = result.lon;
                    const room = curr.createRoomObject(buildingCode,
                        buildingName, roomNumber, roomName, addr, lat, lon,
                        seats, type, furniture, href);
                    curr.rooms.push(room);
                }

                pleaseWork();*/
                async function wait() {
                    const result = await curr.getGeoResponse(addr).catch((err: any) => {
                        Log.trace(err);
                    });
                    lat = result.lat;
                    lon = result.lon;
                }

                wait().then(function () {
                Promise.all(promises).then(function (datas: any[]) {
                    for (const data of datas) {
                        const tree: any = parse5.parse(data);
                        const html = tree.childNodes[6];
                        const body = html.childNodes[3];

                        // helper to find and return node with specific tag
                        const tbody = curr.findNode(body, "tbody");
                        let inner;
                        const rnAttr = "views-field views-field-field-room-number";
                        const rcAttr = "views-field views-field-field-room-capacity";
                        const rfAttr = "views-field views-field-field-room-furniture";
                        const rtAttr = "views-field views-field-field-room-type";
                        if (!isNullOrUndefined(tbody)) {

                            // gets each room's number, capacity, type, furniture, and external link
                            for (const tr of tbody.childNodes) {
                                if (tr.tagName === "tr" && tr !== null) {
                                    inner = tr.childNodes;
                                    if (!isNullOrUndefined(inner)) {
                                        let roomNumber: string;
                                        let roomName: string;
                                        let seats: number;
                                        let type: string;
                                        let furniture: string;
                                        let href: string;
                                        for (const td of inner) {
                                            if (!isNullOrUndefined(td.attrs)) {
                                                const attr = td.attrs[0].value;
                                                if (attr === rnAttr) {
                                                    roomNumber = td.childNodes[1].childNodes[0].value
                                                        .trim();
                                                    roomName = buildingCode + "_" + roomNumber;
                                                    href = td.childNodes[1].attrs[0].value;
                                                } else if (attr === rcAttr) {
                                                    seats = td.childNodes[0].value.trim();
                                                } else if (attr === rfAttr) {
                                                    furniture = td.childNodes[0].value.trim();
                                                } else if (attr === rtAttr) {
                                                    type = td.childNodes[0].value.trim();
                                                }
                                            }

                                        }

                                        const room = curr.createRoomObject(buildingCode,
                                            buildingName, roomNumber, roomName, addr, lat, lon,
                                            seats, type, furniture, href);
                                        curr.rooms.push(room);
                                    }
                                }
                            }
                        }
                    }
                    fulfill();
                }).catch(function (err: any) {
                    reject(err);
                });
                });
            }).catch(function (err: any) {
                reject(err);
            });
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

    public getGeoResponse(address: string): any {

        // gets the geoResponse object for each URI encoded address
        return new Promise(function (fulfill, reject) {
            const encodedAddress = encodeURI(address);

            http.get("http://skaha.cs.ubc.ca:11316/api/v1/team77/" + encodedAddress, (res: any) => {
                const {statusCode} = res;
                const contentType = res.headers["content-type"];

                let error;
                if (statusCode !== 200) {
                    error = new Error("Request Failed.\n" +
                        "Status Code: ${statusCode}");
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error("Invalid content-type.\n" +
                        "Expected application/json but received ${contentType}");
                }
                if (error) {
                    Log.trace("ERROR: " + error.message);
                    // consume response data to free up memory
                    res.resume();
                    return;
                }

                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk: any) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        // Log.trace("PARSED DATA: " + parsedData);
                        if (parsedData.hasOwnProperty("lat")) {
                            fulfill(parsedData);
                        } else {
                            reject(parsedData);
                        }
                    } catch (e) {
                        Log.trace(e.message);
                    }
                });
            }).on("error", (e: any) => {
                Log.trace(`Got error: ${e.message}`);
            });
        });
    }

    // This method adds a new dataset with specified id and content. The content is a base64 string that we need
    // to deserialize using JSZip. The addDataset() method of InsightFacade should make use of this method.

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise <boolean> {
        // JS objects passed as queries, not JSON string (already parsed)
        // Check JS object for validity, rather than validating JSON string/file
        const curr = this;
        if (!fs.existsSync(dataFolder)) {
            fs.mkdirSync(dataFolder);
        }
        if (!fs.existsSync(roomsDataFolder)) {
            fs.mkdirSync(roomsDataFolder);
        }

        return new Promise(function (fulfill, reject) {

            if (kind === InsightDatasetKind.Rooms) {

                for (const dataset of curr.roomDatasets) {
                    if (dataset["metadata"]["id"] === id) {
                        Log.trace("rejecting room");
                        reject(false);
                        return;
                    }
                }
                if (id === null || id === "") { // what if id is a key that does not exist in datasetsToLoad?
                    Log.trace("rejecting room");
                    reject(false);
                    return;
                }

                Log.trace("adding room");
                // Go to parseRoomsDataset
                curr.parseRoomsDataset(id, content).then(function () {
                    Log.trace("parse room fulfilled");
                    /* let roomsObjects = [];
                    for (const room of curr.rooms) {
                        roomsObjects.push(room);
                        curr.rooms.pop();
                    }*/
                    Log.trace(curr.rooms[5].rooms_lat);
                    Log.trace(curr.rooms[5].rooms_lon);
                    Log.trace(curr.rooms.length.toString());

                    const roomsCopy = curr.rooms.slice();
                    const internalData: IRoomDataset = {
                        metadata: {id, kind: InsightDatasetKind.Rooms, numRows: curr.rooms.length},
                        data: roomsCopy, // we need to feed a copy of the object because
                                         // curr.rooms is spliced later
                    };
                    curr.roomDatasets.push(internalData);

                    Log.trace(internalData.metadata.numRows.toString());

                    fs.writeFileSync("./rooms/" + id + ".json", JSON.stringify(internalData));
                    curr.rooms.splice(0, curr.rooms.length);
                    fulfill();
                }).catch(function (err) {
                    reject(err);
                });
            } else {

                // If a dataset with the same ID already exists, we reject
                for (const dataset of curr.courseDatasets) {
                    if (dataset["metadata"]["id"] === id) {
                        reject(false);
                        return;
                    }
                }

                const currZip = new JSZip();

                // what if id is a key that does not exist in datasetsToLoad? (InsightFacade.spec.ts)
                if (id === null || id === "") {
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
                            curr.courseDatasets.push(internalData);

                            fs.writeFileSync("./data/" + id + ".json", JSON.stringify(internalData));
                            fulfill();
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
        const curr = this;
        return new Promise(function (fulfill, reject) {
            try {
                fs.unlinkSync("./data/" + id + ".json");
                curr.courseDatasets = [];
                return fulfill();
            } catch (err) {
                try {
                    fs.unlinkSync("./rooms/" + id + ".json");
                    curr.roomDatasets = [];
                    return fulfill();
                } catch (err) {
                    return reject();
                }
            }
        });
    }

    public getCourseDatasets(): IDataset[] {
        return this.courseDatasets;
    }

    public getRoomDatasets(): IDataset[] {
        return this.roomDatasets;
    }
}
