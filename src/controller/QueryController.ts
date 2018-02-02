
import {IDataset} from "./DataController";

enum Comparator {
    "GT", "LT", "EQ",
}

export interface IResponseData {
    data: number | string;
}

export default class QueryController {

    private datasets: IDataset[];

    constructor(datasets: IDataset[]) {
       this.datasets = datasets;
    }

    // ----------------------------------- filtering by query ------------------------------------------------------

    // Searches through the relevant dataset and returns only the rows/columns that match the constraints in query
    public performQuery(query: any): JSON[] {
        const id: string = this.getQueryID(query);
        let order: string;
        // Order is optional so we only provide it to the helper if it is specified
        if (query["OPTIONS"].hasOwnProperty("ORDER")) {
            order = query["OPTIONS"]["ORDER"];
        } else {
            order = null;
        }
        const columns = query["OPTIONS"]["COLUMNS"];
        // TODO: instead of just returning what's back from the helper, order the results first
        return this.performQueryHelper(query, id, columns);
    }

// ------------------------------- PARSING AND VALIDATION OF QUERY ---------------------------------------------
    public isValidQuery(jsonQuery: any): boolean {
        try {
            // The body should have exactly 2 keys "WHERE" and "OPTIONS"
            if (!jsonQuery.hasOwnProperty("WHERE") || !jsonQuery.hasOwnProperty("OPTIONS") ||
                Object.keys(jsonQuery).length !== 2) {
                return false;
            } else {
                return this.isValidFilter(jsonQuery["WHERE"]) && this.isValidOptions(jsonQuery["OPTIONS"]);
            }
        } catch (err) {
            return false;
        }
    }

    private isValidFilter(jsonBody: any): boolean {
        // const jsonBody = JSON.parse(body);
        // Check if the current filter is valid by checking the keywords and recursively calling if necessary.
        if (jsonBody.hasOwnProperty("LT")) {
            if (Object.keys(jsonBody["LT"]).length !== 1) {
                return false;
            } else {
                return this.isValidKey(Object.keys(jsonBody["LT"])[0]) &&
                    typeof jsonBody["LT"][Object.keys(jsonBody["LT"])[0]] === "number";
            }
        } else if (jsonBody.hasOwnProperty("GT")) {
            if (Object.keys(jsonBody["GT"]).length !== 1) {
                return false;
            } else {
                return this.isValidKey(Object.keys(jsonBody["GT"])[0]) &&
                    typeof jsonBody["GT"][Object.keys(jsonBody["GT"])[0]] === "number";
            }
        } else if (jsonBody.hasOwnProperty("EQ")) {
            if (Object.keys(jsonBody["EQ"]).length !== 1) {
                return false;
            } else {
                return this.isValidKey(Object.keys(jsonBody["EQ"])[0]) &&
                    typeof jsonBody["EQ"][Object.keys(jsonBody["EQ"])[0]] === "number";
            }
        } else if (jsonBody.hasOwnProperty("AND")) {
            if (jsonBody["AND"].length !== 2) {
                return false;
            } else {
                const filter = this.isValidFilter(jsonBody["AND"][0]);
                const filter2 = this.isValidFilter(jsonBody["AND"][1]);
                return this.isValidFilter(jsonBody["AND"][0]) && this.isValidFilter(jsonBody["AND"][1]);
            }
        } else if (jsonBody.hasOwnProperty("OR")) {
            if (jsonBody["OR"].length !== 2) {
                return false;
            } else {
                return this.isValidFilter(jsonBody["OR"][0]) && this.isValidFilter(jsonBody["OR"][1]);
            }
        } else if (jsonBody.hasOwnProperty("NOT")) {
            if (jsonBody["NOT"].length !== 1) {
                return false;
            } else {
                return this.isValidFilter(jsonBody["NOT"]);
            }
        } else if (jsonBody.hasOwnProperty("IS")) {
            if (Object.keys(jsonBody["IS"]).length !== 1) {
                return false;
            } else {
                const isKey = this.isValidKey(Object.keys(jsonBody["IS"])[0]);
                const inputString = jsonBody["IS"][Object.keys(jsonBody["IS"])[0]];
                if (inputString.indexOf("*") !== -1 && inputString.indexOf("*") !== 0 && inputString.indexOf("*") !==
                    inputString.length - 1) {
                    return false;
                } else {
                    return isKey;
                }
            }
        } else {
            // The filter doesn't match any keywords in our EBNF, so return false
            return false;
        }
    }

    private isValidKey(key: string) {
        const splitArr = key.split("_");
        return splitArr.length === 2 && splitArr[0].length > 0 && splitArr[1].length > 0;
    }

    private isValidOptions(optionsBody: any) {
        if ((Object.keys(optionsBody).length !== 1 && Object.keys(optionsBody).length !== 2) ||
            !optionsBody.hasOwnProperty("COLUMNS")) {
            return false;
        } else {
            let validKeys = true;
            for (const key of optionsBody["COLUMNS"]) {
                validKeys = validKeys && this.isValidKey(key);
            }

            if (optionsBody.hasOwnProperty("ORDER")) {
                return validKeys && this.isValidKey(optionsBody["ORDER"]);
            } else {
                return validKeys;
            }
        }
    }

    private getQueryID(query: any): string {
        return query["OPTIONS"]["COLUMNS"][0].split("_")[0];
    }

    private getDatasetWithID(id: string) {
        for (const dataset of this.datasets) {
            if (dataset["metadata"]["id"] === id) {
                return dataset;
            }
        }
        return null;
    }

    // Helper to return only entries in the dataset that match the MCOMPARATOR constraint
    private comparatorHelper(comparator: Comparator, currDataset: IDataset, columns: string[], key: string,
                             query: any): JSON[] {
        const data: any = [];
        // Iterate through each data block (this corresponds to one file in the zip)
        for (const json of currDataset["data"]) {
            const realJson: any = json; // This is a workaround for a tslint bug
            // Iterate through the results array within the data block
            for (const course of realJson["result"]) {
                const response: any = {};
                if (comparator === Comparator.GT && course[key] > query["GT"][key]) {
                    for (const column of columns) {
                        response[column] = course[column];
                    }
                } else if (comparator === Comparator.LT && course[key] < query["LT"][key]) {
                    for (const column of columns) {
                        response[column] = course[column];
                    }
                } else if (comparator === Comparator.EQ && course[key] === query["EQ"][key]) {
                    for (const column of columns) {
                        response[column] = course[column];
                    }
                }
                data.push(response);
            }
        }
        return data;
    }

    // Returns unordered results after filtering the dataset based on query
    private performQueryHelper(query: any, id: string, columns: string[]): JSON[] {
        if (query.hasOwnProperty("AND")) {
            // Get the intersection of the two subsets
            const firstArr = this.performQueryHelper(query["AND"][0], id, columns);
            const secondArr = this.performQueryHelper(query["AND"][1], id, columns);
            return firstArr.filter((n) => secondArr.includes(n));
        } else if (query.hasOwnProperty("OR")) {
            // Get the union of the two subsets
            const firstArr = this.performQueryHelper(query["AND"][0], id, columns);
            const secondArr = this.performQueryHelper(query["AND"][1], id, columns);
            const set = new Set(firstArr.concat(secondArr));
            return Array.from(set);
        } else if (query.hasOwnProperty("GT")) {
            // The first part of the key MUST match the id of the dataset we are querying
            const key = Object.keys(query["GT"])[0];
            if (key.split("_")[0] !== id) {
                throw new Error("The key used in GT is not valid");
            } else {
                const currDataset = this.getDatasetWithID(id);
                if (currDataset === null) {
                    throw new Error("Dataset with id: " + id + " does not exist");
                }
                return this.comparatorHelper(Comparator.GT, currDataset, columns, key, query);
            }
        } else if (query.hasOwnProperty("LT")) {
            // The first part of the key MUST match the id of the dataset we are querying
            const key = Object.keys(query["LT"])[0];
            if (key.split("_")[0] !== id) {
                throw new Error("The key used in LT is not valid");
            } else {
                const currDataset = this.getDatasetWithID(id);
                if (currDataset === null) {
                    throw new Error("Dataset with id: " + id + " does not exist");
                }
                return this.comparatorHelper(Comparator.LT, currDataset, columns, key, query);
            }
        } else if (query.hasOwnProperty("EQ")) {
            // The first part of the key MUST match the id of the dataset we are querying
            const key = Object.keys(query["EQ"])[0];
            if (key.split("_")[0] !== id) {
                throw new Error("The key used in EQ is not valid");
            } else {
                const currDataset = this.getDatasetWithID(id);
                if (currDataset === null) {
                    throw new Error("Dataset with id: " + id + " does not exist");
                }
                return this.comparatorHelper(Comparator.EQ, currDataset, columns, key, query);
            }
        }
        // TODO: implement the IS and NOT cases
    }
}
