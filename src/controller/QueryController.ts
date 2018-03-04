import Decimal from "decimal.js";
import {IDataset, IRoomDataset} from "./DataController";

enum Comparator {
    "GT", "LT", "EQ", "IS",
}

enum StringKeys {
    "Subject", "Course", "Professor", "Title", "id",
}

enum NumberKeys {
    "Avg", "Pass", "Fail", "Audit",
}

enum Token {
    "MAX", "MIN", "AVG", "COUNT", "SUM",
}

export interface IResponseData {
    data: number | string;
}

export default class QueryController {

    private courseDatasets: IDataset[];
    private roomDatasets: IDataset[];

    constructor(courseDatasets: IDataset[], roomDatasets: IRoomDataset[]) {
       this.courseDatasets = courseDatasets;
       this.roomDatasets = roomDatasets;
    }

    // ----------------------------------- filtering by query ------------------------------------------------------

    // Searches through the relevant dataset and returns only the rows/columns that match the constraints in query
    public performQuery(query: any): JSON[] {
            const id: string = this.getQueryID(query);
            let order: string;
            // Order is optional so we only provide it to the helper if it is specified
            if (query["OPTIONS"].hasOwnProperty("ORDER")) {
                order = query["OPTIONS"]["ORDER"]["keys"];
            } else {
                order = null;
            }
            const columns = query["OPTIONS"]["COLUMNS"];
            let result: JSON[];
            if (!query.hasOwnProperty("TRANSFORMATIONS")) {
                result = this.performQueryHelper(query["WHERE"], id, columns);
            } else {
                const keyColumns = [];
                const applyColumns = [];
                for (const applyBody of query["TRANSFORMATIONS"]["APPLY"]) {
                    keyColumns.push(applyBody[Object.keys(applyBody)[0]]
                        [Object.keys(applyBody[Object.keys(applyBody)[0]])[0]]);
                }
                for (const groupKey of query["TRANSFORMATIONS"]["GROUP"]) {
                    keyColumns.push(groupKey);
                }
                for (const key of columns) {
                    if (!key.includes("_")) {
                        applyColumns.push(key);
                    }
                }
                result = this.performQueryHelper(query["WHERE"], id, keyColumns);
                result = this.performTransformations(query["TRANSFORMATIONS"], id, applyColumns, result);
            }

            if (order !== null) {
                result.sort(function (a: any, b: any) {
                    for (const key of order) {
                        if (!(a[key] - b[key] === 0)) {
                            return a[key] - b[key];
                        }
                    }
                    return 0;
                });
            }
            return result;
    }

// ------------------------------- PARSING AND VALIDATION OF QUERY ---------------------------------------------
    public isValidQuery(jsonQuery: any): boolean {
        try {
            // The body should have 2 or 3 keys "WHERE" and "OPTIONS" are required. "TRANSFORMATIONS" is optional
            if (!jsonQuery.hasOwnProperty("WHERE") || !jsonQuery.hasOwnProperty("OPTIONS") ||
                Object.keys(jsonQuery).length > 3 || Object.keys(jsonQuery).length < 2) {
                return false;
            } else {
                if (Object.keys(jsonQuery).length === 2) {
                    return this.isValidFilter(jsonQuery["WHERE"]) && this.isValidOptions(jsonQuery["OPTIONS"]);
                } else {
                    const applyKeys = [];
                    for (const key of jsonQuery["OPTIONS"]["COLUMNS"]) {
                        if (!this.isValidKey(key)) {
                            applyKeys.push(key);
                        }
                    }
                    return this.isValidFilter(jsonQuery["WHERE"]) && this.isValidOptions(jsonQuery["OPTIONS"])
                    && this.isValidTransformations(jsonQuery["TRANSFORMATIONS"], applyKeys);
                }
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
            const existingColumns = [];
            for (const key of optionsBody["COLUMNS"]) {
                existingColumns.push(key);
            }
            if (!optionsBody.hasOwnProperty("ORDER")) {
                return true;
            } else {
                const orderBody = optionsBody["ORDER"];
                if (!orderBody.hasOwnProperty("dir") || !orderBody.hasOwnProperty("keys")) {
                    return false;
                }
                if (!(orderBody["dir"] === "UP") && !(orderBody["dir"] === "DOWN")) {
                    return false;
                }
                let validKeysOrder = true;
                for (const key of orderBody["keys"]) {
                    validKeysOrder = validKeysOrder && existingColumns.includes(key);
                }
                return validKeysOrder;
            }
        }
    }

    private isValidTransformations(transformationsBody: any, applyKeys: string[]): boolean {
        if (!transformationsBody.hasOwnProperty("GROUP") || !transformationsBody.hasOwnProperty("APPLY")) {
            return false;
        }
        for (const groupKey of transformationsBody["GROUP"]) {
            if (!this.isValidKey(groupKey)) {
                return false;
            }
        }
        let count = applyKeys.length;
        const uniqueApplyKeys: string[] = [];
        for (const applyBody of transformationsBody["APPLY"]) {
            if (Object.keys(applyBody).length !== 1) {
                return false;
            } else {
                const applyKey = Object.keys(applyBody)[0];
                if (uniqueApplyKeys.includes(applyKey)) {
                    return false;
                }
                uniqueApplyKeys.push(applyKey);
                if (applyKeys.includes(applyKey)) {
                    count = count - 1;
                }
                const token = Object.keys(applyBody[applyKey])[0];
                if (!Object.values(Token).includes(token) ||
                    !this.isValidKey(applyBody[applyKey][token])) {
                    return false;
                }
            }
        }
        return count === 0;
    }

    private performTransformations(transformationsBody: any, id: string, columns: string[],
                                   queryResult: any[]): JSON[] {
        const groupKeys = [];
        for (const groupKey of transformationsBody["GROUP"]) {
            groupKeys.push(groupKey);
        }
        const groups: any = {};
        // Form the groups by checking the equality of the keys listed in "GROUP"
        for (const row of queryResult) {
            let groupID = "";
            for (const groupKey of groupKeys) {
                groupID = groupID.concat(row[groupKey]).concat(",");
            }
            if (groups.hasOwnProperty(groupID)) {
                groups[groupID]["ROWS"].push(row);
            } else {
                groups[groupID] = {};
                groups[groupID]["ROWS"] = [];
                groups[groupID]["ROWS"].push(row);
            }
        }
        // Perform the transformations
        for (const applyBody of transformationsBody["APPLY"]) {
            const applyString = Object.keys(applyBody)[0];
            if (columns.includes(applyString)) {
                const columnToCalc = applyBody[applyString][Object.keys(applyBody[applyString])[0]];
                for (const key of Object.keys(groups)) {
                    const group = groups[key];
                    const applyToken = Object.keys(applyBody[applyString])[0];
                    const numRows = group["ROWS"].length;
                    // COUNT token is a bit different from the other 4 tokens so handle separately
                    if (applyToken === "COUNT") {
                        const uniques: any[] = [];
                        for (const row of group["ROWS"]) {
                            if (!uniques.includes(row[columnToCalc])) {
                                uniques.push(row[columnToCalc]);
                            }
                        }
                        group[applyString] = uniques.length;
                    } else {
                        if (isNaN(group["ROWS"][0][columnToCalc])) {
                            throw new Error("MAX/MIN/SUM/AVG only works on numerical columns");
                        }
                        // SUM, AVG, MAX/MIN are similar so handle them together
                        let sum: Decimal = new Decimal(0);
                        let min = group["ROWS"][0][columnToCalc];
                        let max = group["ROWS"][0][columnToCalc];
                        for (const row of group["ROWS"]) {
                            const currNum = row[columnToCalc];
                            const currNumDec: Decimal = new Decimal(currNum);
                            sum = currNumDec.add(sum);
                            if (currNum < min) {
                                min = currNum;
                            }
                            if (currNum > max) {
                                max = currNum;
                            }
                        }
                        if (applyToken === "AVG") {
                            const avg = Number(sum) / numRows;
                            group[applyString] = Number(avg.toFixed(2));
                        } else if (applyToken === "SUM") {
                            group[applyString] = Number(sum.toFixed(2));
                        } else if (applyToken === "MIN") {
                            group[applyString] = min;
                        } else if (applyToken === "MAX") {
                            group[applyString] = max;
                        }
                    }
                }
            }
        }

        const result: any[] = [];
        for (const key of Object.keys(groups)) {
            const group = groups[key];
            const row: any = {};
            for (const groupKey of groupKeys) {
                row[groupKey] = group["ROWS"][0][groupKey];
            }
            for (const transformationCol of Object.keys(group)) {
                if (transformationCol !== "ROWS") {
                    row[transformationCol] = group[transformationCol];
                }
            }
            result.push(row);
        }
        return result;
    }

    private getQueryID(query: any): string {
        return query["OPTIONS"]["COLUMNS"][0].split("_")[0];
    }

    private getDatasetWithID(id: string) {
        for (const dataset of this.courseDatasets) {
            if (dataset["metadata"]["id"] === id) {
                return dataset;
            }
        }
        for (const dataset of this.roomDatasets) {
            if (dataset["metadata"]["id"] === id) {
                return dataset;
            }
        }
        return null;
    }

    private resolveKeySuffix(keySuffix: string, kind: string) {
        if (kind === "rooms") {
            return keySuffix;
        }
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
        const dataKind: string = currDataset["metadata"]["kind"];
        const keySuffix = this.resolveKeySuffix(key.split("_")[1], dataKind);
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
        if (dataKind === "courses" && keySuffix !== "Avg" && keySuffix !== "Pass" && keySuffix !== "Fail" &&
            keySuffix !== "Audit") {
            throw new Error("Key type " + keySuffix + " cannot be used with MCOMPARATORs");
        }
        if (dataKind === "lat" && keySuffix !== "lon" && keySuffix !== "seats") {
            throw new Error("Key type " + keySuffix + " cannot be used with MCOMPARATORs");
        }
        // Iterate through each data block (this corresponds to one file in the zip)
        if (dataKind === "courses") {
            for (const json of currDataset["data"]) {
                const realJson: any = json; // This is a workaround for a tslint bug
                // Iterate through the results array within the data block
                for (const course of realJson["result"]) {
                    if (typeof course[keySuffix] !== "number") {
                        throw Error("Value " + course[keySuffix] + "is not a number");
                    }
                    if (comparator === Comparator.GT && course[keySuffix] > query["GT"][key]) {
                        let response: any = {};
                        for (const column of columns) {
                            response = this.extractFromDataset(column, course, response, dataKind);
                        }
                        data.push(response);
                    } else if (comparator === Comparator.LT && course[keySuffix] < query["LT"][key]) {
                        let response: any = {};
                        for (const column of columns) {
                            response = this.extractFromDataset(column, course, response, dataKind);
                        }
                        data.push(response);
                    } else if (comparator === Comparator.EQ && course[keySuffix] === query["EQ"][key]) {
                        let response: any = {};
                        for (const column of columns) {
                            response = this.extractFromDataset(column, course, response, dataKind);
                        }
                        data.push(response);
                    }
                }
            }
        } else {
            for (const room of currDataset["data"]) {
                const realRoom: any = room; // This is a workaround for a tslint bug
                // Iterate through the results array within the data block
                if (typeof realRoom[keySuffix] !== "number") {
                    throw Error("Value " + realRoom[keySuffix] + "is not a number");
                }
                if (comparator === Comparator.GT && realRoom[keySuffix] > query["GT"][key]) {
                    let response: any = {};
                    for (const column of columns) {
                        response = this.extractFromDataset(column, realRoom, response, dataKind);
                    }
                    data.push(response);
                } else if (comparator === Comparator.LT && realRoom[keySuffix] < query["LT"][key]) {
                    let response: any = {};
                    for (const column of columns) {
                        response = this.extractFromDataset(column, realRoom, response, dataKind);
                    }
                    data.push(response);
                } else if (comparator === Comparator.EQ && realRoom[keySuffix] === query["EQ"][key]) {
                    let response: any = {};
                    for (const column of columns) {
                        response = this.extractFromDataset(column, realRoom, response, dataKind);
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
        const currDataset = this.getDatasetWithID(id);
        const dataKind = currDataset["metadata"]["kind"];
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
                if (currDataset === null) {
                    throw new Error("Dataset with id: " + id + " does not exist");
                }
                return this.comparatorHelper(Comparator.EQ, currDataset, columns, key, query);
            }
        } else if (query.hasOwnProperty("IS")) {
            // The first part of the key MUST match the id of the dataset we are querying
            const key = Object.keys(query["IS"])[0];
            if (key.split("_")[0] !== id) {
                throw new Error("The key used in IS is not valid");
            } else {
                if (currDataset === null) {
                    throw new Error("Dataset with id: " + id + " does not exist");
                }
                return this.isHelper(Comparator.IS, currDataset, columns, key, query);
            }
        } else if (query.hasOwnProperty("NOT")) {
            if (currDataset === null) {
                throw new Error("Dataset with id: " + id + " does not exist");
            }
            const currDataColumns: any[] = [];
            for (const json of currDataset["data"]) {
                const realJson: any = json; // This is a workaround for a tslint bug
                // Iterate through the results array within the data block
                for (const course of realJson["result"]) {
                    let response: any = {};
                    for (const column of columns) {
                        response = this.extractFromDataset(column, course, response, dataKind);
                    }
                    currDataColumns.push(response);
                }
            }
            const blah = this.setDifference(this.performQueryHelper(query["NOT"], id, columns),
                currDataColumns);
            return blah;
        }
   /* } catch (err) {
        Log.trace(err);
    } */
    }

    // Helper to return only entries in the dataset that match the SCOMPARISON constraint
    private isHelper(comparator: Comparator, currDataset: IDataset, columns: string[], key: string,
                     query: any): JSON[] {
        const data: any = [];
        const dataKind: string = currDataset["metadata"]["kind"];
        const keySuffix = this.resolveKeySuffix(key.split("_")[1], dataKind);
        if (dataKind === "courses" && keySuffix !== "Subject" && keySuffix !== "Course" && keySuffix !== "Professor" &&
            keySuffix !== "Title" && keySuffix !== "id") {
            throw new Error("Key type " + keySuffix + " cannot be used with SCOMPARATORs");
        }
        if (dataKind === "fullname" && keySuffix !== "shortname" && keySuffix !== "number" && keySuffix !== "name" &&
            keySuffix !== "address" && keySuffix !== "type" && keySuffix !== "furniture" && keySuffix !== "href") {
            throw new Error("Key type " + keySuffix + " cannot be used with SCOMPARATORs");
        }
        // Iterate through each data block (this corresponds to one file in the zip)
        if (dataKind === "courses") {
            for (const json of currDataset["data"]) {
                const realJson: any = json; // This is a workaround for a tslint bug
                // Iterate through the results array within the data block
                for (const course of realJson["result"]) {
                    if (typeof course[keySuffix] !== "string") {
                        throw Error("Value " + course[keySuffix] + "is not a string");
                    }
                    if (this.matchWildCard(query["IS"][key], course[keySuffix])) {
                        let response: any = {};
                        for (const column of columns) {
                            response = this.extractFromDataset(column, course, response, dataKind);
                        }
                        data.push(response);
                    }
                }
            }
        } else {
            for (const room of currDataset["data"]) {
                const realRoom: any = room; // This is a workaround for a tslint bug
                if (typeof realRoom[keySuffix] !== "string") {
                    throw Error("Value " + realRoom[keySuffix] + "is not a string");
                }
                if (this.matchWildCard(query["IS"][key], realRoom[keySuffix])) {
                    let response: any = {};
                    for (const column of columns) {
                        response = this.extractFromDataset(column, realRoom, response, dataKind);
                    }
                    data.push(response);
                }
            }
        }
        return data;
    }

    private extractFromDataset(column: string, course: any, response: any, dataKind: string): any {
        const columnSuffix = column.split("_")[1];
        const colName = this.resolveKeySuffix(columnSuffix, dataKind);
        if (colName === "id") {
            // id in the JSON is a number, but we want to read it as a string as per the D1 specs
            response[column] = course[colName].toString();
        } else {
            response[column] = course[colName];
        }
        return response;
    }

    private setDifference (courses: any[], courses2: any[]): any[] {
        if (courses.length === 0) {
            return courses;
        }
        const result: any = [];
        const object: any = {};
        let value: string;
        let i: number;
        for (i = 0; i < courses.length; i++) {
            object[JSON.stringify(courses[i])] = true;
        }
        for (i = 0; i < courses2.length; i++) {
            value = JSON.stringify(courses2[i]);
            if (!(value in object)) {
                result.push(courses2[i]);
            }
        }
        return result;
    }

    private intersectArray (courses: any[], courses2: any[]): any[] {
        if (courses.length === 0) {
            return courses;
        }
        const result: any = [];
        const object: any = {};
        let value: string;
        let i: number;
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
