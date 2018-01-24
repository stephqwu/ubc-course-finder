import JSZip = require("jszip");
import {JSZipObject} from "jszip";
import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";
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
    }

    // This method adds a new dataset with specified id and content. The content is a base64 string that we need
    // to deserialize using JSZip. The addDataset() method of InsightFacade should make use of this method.
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<boolean> {
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
                    curr.datasets.push({metadata: {id, kind: InsightDatasetKind.Courses, numRows}, data: jsons});
                    fulfill(true);
                });
            });
        });
    }
}
