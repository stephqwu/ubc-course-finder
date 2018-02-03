
import {IDataset} from "./DataController";
import Log from "../Util";

// TODO: we should take out NOT from this enum after notHelper is fixed. NOT is not a comparator
enum Comparator {
    "GT", "LT", "EQ", "IS",
}

enum StringKeys {
    "Subject", "Course", "Professor", "Title", "id",
}

enum NumberKeys {
    "Avg", "Pass", "Fail", "Audit",
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
        // try {
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
            const result = this.performQueryHelper(query["WHERE"], id, columns);
            result.sort(function (a: any, b: any) {
                return a[order] - b[order];
            });
            return result;
        /* } catch (err) {
            Log.trace(err);
        }*/
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
            if (jsonBody["AND"].length < 1) {
                return false;
            } else {
                const filter = this.isValidFilter(jsonBody["AND"][0]);
                const filter2 = this.isValidFilter(jsonBody["AND"][1]);
                return this.isValidFilter(jsonBody["AND"][0]) && this.isValidFilter(jsonBody["AND"][1]);
            }
        } else if (jsonBody.hasOwnProperty("OR")) {
            if (jsonBody["OR"].length < 1) {
                return false;
            } else {
                return this.isValidFilter(jsonBody["OR"][0]) && this.isValidFilter(jsonBody["OR"][1]);
            }
        } else if (jsonBody.hasOwnProperty("NOT")) {
            if (Object.keys(jsonBody["NOT"]).length !== 1) {
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
            let existingKey = false;
            for (const key of optionsBody["COLUMNS"]) {
                validKeys = validKeys && this.isValidKey(key);
                if (key === optionsBody["ORDER"]) {
                    existingKey = true;
                }
            }
            if (!optionsBody.hasOwnProperty("ORDER")) {
                existingKey = true;
            }
            if (!existingKey) {
                validKeys = false;
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


    private resolveKeySuffix(keySuffix: string) {
        if (keySuffix === "dept") {
            return "Subject";
        } else if (keySuffix === "id") {
            return "Course";
        } else if (keySuffix === "avg") {
            return "Avg";
        } else if (keySuffix === "instructor") {
            return "Professor";
        } else if (keySuffix === "title") {
            return "Title";
        } else if (keySuffix === "pass") {
            return "Pass";
        } else if (keySuffix === "fail") {
            return "Fail";
        } else if (keySuffix === "audit") {
            return "Audit";
        } else if (keySuffix === "uuid") {
            return "id";
        } else {
            throw Error("That is not a pre-defined column name");
        }
    }

    // Helper to return only entries in the dataset that match the MCOMPARATOR constraint
    private comparatorHelper(comparator: Comparator, currDataset: IDataset, columns: string[], key: string,
                             query: any): JSON[] {
        const data: any = [];
        const keySuffix = this.resolveKeySuffix(key.split("_")[1]);
        /* let rightKeyType = true;
        for (key in NumberKeys) {
            if (keySuffix === key) {
                rightKeyType = true;
            }
            rightKeyType = false;
        }
        if (!rightKeyType) {
            throw new Error("Key type" + keySuffix + "cannot be used with MCOMPARATORs");
        } */
        if (keySuffix !== "Avg" && keySuffix !== "Pass" && keySuffix !== "Fail" && keySuffix !== "Audit") {
            throw new Error("Key type " + keySuffix + " cannot be used with MCOMPARATORs");
        }
        // Iterate through each data block (this corresponds to one file in the zip)
        for (const json of currDataset["data"]) {
            const realJson: any = json; // This is a workaround for a tslint bug
            // Iterate through the results array within the data block
            for (const course of realJson["result"]) {
                if (typeof course[keySuffix] !== "number") {
                    throw Error("Value " + course[keySuffix] + "is not a number");
                }
                if (comparator === Comparator.GT && course[keySuffix] > query["GT"][key]) {
                    const response: any = {};
                    for (const column of columns) {
                        const columnSuffix = column.split("_")[1];
                        const colName = this.resolveKeySuffix(columnSuffix);
                        response[column] = course[colName];
                    }
                    data.push(response);
                } else if (comparator === Comparator.LT && course[keySuffix] < query["LT"][key]) {
                    const response: any = {};
                    for (const column of columns) {
                        const columnSuffix = column.split("_")[1];
                        const colName = this.resolveKeySuffix(columnSuffix);
                        response[column] = course[colName];
                    }
                    data.push(response);
                } else if (comparator === Comparator.EQ && course[keySuffix] === query["EQ"][key]) {
                    const response: any = {};
                    for (const column of columns) {
                        const columnSuffix = column.split("_")[1];
                        const colName = this.resolveKeySuffix(columnSuffix);
                        response[column] = course[colName];
                    }
                    data.push(response);
                }
            }
        }
        return data;
    }

    // Returns unordered results after filtering the dataset based on query
    private performQueryHelper(query: any, id: string, columns: string[]): JSON[] {
        // try {
            if (query.hasOwnProperty("AND")) {
                // Get the intersection of the 1 or more subsets
                let result = this.performQueryHelper(query["AND"][0], id, columns);
                for (let i = 1; i < query["AND"].length; i++) {
                    result = this.intersectArray(result, this.performQueryHelper(query["AND"][i], id, columns));
                }
                return result;
            } else if (query.hasOwnProperty("OR")) {
                // Get the union of the 1 or more subsets
                let result = this.performQueryHelper(query["OR"][0], id, columns);
                for (let i = 1; i < query["OR"].length; i++) {
                    result = result.concat(this.performQueryHelper(query["OR"][i], id, columns));
                }
                const set = new Set(result);
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
                } // TODO: implement the IS and NOT cases
            } else if (query.hasOwnProperty("IS")) {
                // The first part of the key MUST match the id of the dataset we are querying
                const key = Object.keys(query["IS"])[0];
                if (key.split("_")[0] !== id) {
                    throw new Error("The key used in IS is not valid");
                } else {
                    const currDataset = this.getDatasetWithID(id);
                    if (currDataset === null) {
                        throw new Error("Dataset with id: " + id + " does not exist");
                    }
                    return this.isHelper(Comparator.IS, currDataset, columns, key, query);
                }
            } else if (query.hasOwnProperty("NOT")) {
                // Get the complement/difference of a subset
                /* const subset = this.performQueryHelper(query["NOT"][0], id, columns);
                const all = ;
                return all.filter((n) => !subset.includes(n)); */

                /*const key = Object.keys(query["NOT"])[0];
                if (key.split("_")[0] !== id) {
                    throw new Error("The key used in NOT is not valid");
                } else {
                    const currDataset = this.getDatasetWithID(id);
                    if (currDataset === null) {
                        throw new Error("Dataset with id: " + id + " does not exist");
                    }
                    return this.notHelper(Comparator.NOT, currDataset, columns, key, query);
                }*/
            }
       /* } catch (err) {
            Log.trace(err);
        } */
    }

    // Helper to return only entries in the dataset that match the SCOMPARISON constraint
    private isHelper(comparator: Comparator, currDataset: IDataset, columns: string[], key: string,
                     query: any): JSON[] {
        const data: any = [];
        const keySuffix = this.resolveKeySuffix(key.split("_")[1]);
        if (keySuffix !== "Subject" && keySuffix !== "Course" && keySuffix !== "Professor" && keySuffix !== "Title"
            && keySuffix !== "id") {
            throw new Error("Key type " + keySuffix + " cannot be used with SCOMPARATORs");
        }
        // Iterate through each data block (this corresponds to one file in the zip)
        for (const json of currDataset["data"]) {
            const realJson: any = json; // This is a workaround for a tslint bug
            // Iterate through the results array within the data block
            for (const course of realJson["result"]) {
                if (typeof course[keySuffix] !== "string") {
                    throw Error("Value " + course[keySuffix] + "is not a string");
                }
                if (this.matchWildCard(query["IS"][key], course[keySuffix])) {
                    const response: any = {};
                    for (const column of columns) {
                        const columnSuffix = column.split("_")[1];
                        const colName = this.resolveKeySuffix(columnSuffix);
                        response[column] = course[colName];
                    }
                    data.push(response);
                }
            }
        }
        return data;
    }

    // TODO: this entire helper needs to be re-written because it assumes that NOT has a key-value pair although it
    // TODO: takes in a filter
    // Helper to return only entries in the dataset that match the NEGATION constraint
    /* private notHelper(comparator: Comparator, currDataset: IDataset, columns: string[], key: string,
                      query: any): JSON[] {
        const data: any = [];
        const keySuffix = this.resolveKeySuffix(key.split("_")[1]);
        // Iterate through each data block (this corresponds to one file in the zip)
        for (const json of currDataset["data"]) {
            const realJson: any = json; // This is a workaround for a tslint bug
            // Iterate through the results array within the data block
            for (const course of realJson["result"]) {
                if (!Object.is(course[keySuffix], query["NOT"][key])) {
                    const response: any = {};
                    for (const column of columns) {
                        const columnSuffix = column.split("_")[1];
                        const colName = this.resolveKeySuffix(columnSuffix);
                        response[column] = course[colName];
                    }
                    data.push(response);
                }
            }
        }
        return data;
    } */

    private intersectArray (courses: any[], courses2: any[]): any[] {
        if (courses.length === 0) {
            return courses;
        }
        const result: any = [];
        const object: any = {};
        let value;
        let i;
        for (i = 0; i < courses2.length; i++) {
            object[JSON.stringify(courses2[i])] = true;
        }
        for (i = 0; i < courses.length; i++) {
            value = JSON.stringify(courses[i]);
            if (value in object) {
                result.push(JSON.parse(value));
            }
        }
        return result;
    }

    private matchWildCard(inputString: string, stringToMatch: string): boolean {
        if (inputString.indexOf("*") === -1) {
            return inputString === stringToMatch;
        } else {
            // if the input string has wild cards, we need to deal with it
            return new RegExp("^" + inputString.split("*").join(".*") + "$").test(stringToMatch);
        }
    }
}
