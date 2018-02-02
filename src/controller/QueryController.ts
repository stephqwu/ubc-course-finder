
import {IDataset} from "./DataController";

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
        return this.performQueryHelper(query, id, order, columns);
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

    private performQueryHelper(query: any, id: string, order: string, columns: string[]): JSON[] {
        if (query.hasOwnProperty("AND")) {
            // Get the intersection of the two subsets
            const firstArr = this.performQueryHelper(query["AND"][0], id, order, columns);
            const secondArr = this.performQueryHelper(query["AND"][1], id, order, columns);
            return firstArr.filter((n) => secondArr.includes(n));
        } else if (query.hasOwnProperty("OR")) {
            // Get the union of the two subsets
            const firstArr = this.performQueryHelper(query["AND"][0], id, order, columns);
            const secondArr = this.performQueryHelper(query["AND"][1], id, order, columns);
            const set = new Set(firstArr.concat(secondArr));
            return Array.from(set);
        }
    }
}
