import { expect } from "chai";

import { InsightDatasetKind, InsightResponse, InsightResponseSuccessBody } from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import QueryController from "../src/controller/QueryController";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    response: InsightResponse;
    filename: string;  // This is injected when reading the file
}

describe("QueryController parse/validation tests", function () {
    it ("Should return true for valid query", () => {
        const controller = new QueryController(null, null);
        const isValid = controller.isValidQuery({
            WHERE: {
                OR: [
                    {
                        AND: [
                            {
                                GT: {
                                    courses_avg: 90,
                                },
                            },
                            {
                                IS: {
                                    courses_dept: "adhe",
                                },
                            },
                        ],
                    },
                    {
                        EQ: {
                            courses_avg: 95,
                        },
                    },
                ],
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_id",
                    "courses_avg",
                ],
                ORDER: {
                    dir: "DOWN",
                    keys: ["courses_avg"],
                },
            },
        });
        expect(isValid).to.equal(true);
    });

    it ("Should return false for invalid query", () => {
        const controller = new QueryController(null, null);
        const isValid = controller.isValidQuery({
            WHERE: {
                OR: [
                    {
                        AND: [
                            {
                                GT: {
                                    courses_avg: 90,
                                },
                            },
                            {
                                IS: {
                                    courses_dept: "adhe",
                                },
                            },
                        ],
                    },
                    {
                        EQ: {
                            courses_avg: 95,
                        },
                    },
                ],
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_id",
                    "courses_avg",
                ],
                ORDER: "courses",
            },
        });
        expect(isValid).to.equal(false);
    });

    it ("Should return true for valid d2 query", () => {
        const controller = new QueryController(null, null);
        const isValid = controller.isValidQuery({
            WHERE: {
                GT: { courses_avg: 70 },
            },
            OPTIONS: {
                COLUMNS: ["courses_title", "overallAvg"],
            },
            TRANSFORMATIONS: {
                GROUP: ["courses_title"],
                APPLY: [{
                    overallAvg: {
                        AVG: "courses_avg",
                    },
                }],
            },
        });
        expect(isValid).to.equal(true);
    });

    it ("Should return false for invalid d2 query", () => {
        const controller = new QueryController(null, null);
        const isValid = controller.isValidQuery({
            WHERE: {
                GT: { courses_avg: 70 },
            },
            OPTIONS: {
                COLUMNS: ["courses_title", "overallAvg"],
            },
            TRANSFORMATIONS: {
                GROUP: ["courses_title"],
                APPLY: [{
                    overallAvg: {
                        AVG: "courses_avg",
                    },
                },
                    {
                        overallAvg: {
                            AVG: "courses_avg",
                        },
                    },
                ],
            },
        });
        expect(isValid).to.equal(false);
    });

    it ("Should return true for valid more advanced d2 query", () => {
        const controller = new QueryController(null, null);
        const isValid = controller.isValidQuery({
            WHERE: {
                GT: { courses_avg: 70 },
            },
            OPTIONS: {
                COLUMNS: ["courses_title", "overallAvg"],
                ORDER: {
                    dir: "DOWN",
                    keys: ["overallAvg"],
                },
            },
            TRANSFORMATIONS: {
                GROUP: ["courses_title"],
                APPLY: [{
                    overallAvg: {
                        AVG: "courses_avg",
                    },
                }],
            },
        });
        expect(isValid).to.equal(true);
    });
});

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        confusion: "./test/data/confusion.zip",    // malformed JSON in courses folder (no files + 1 folder)
        courses: "./test/data/courses.zip",        // many files + one folder
        // fakedata: "./test/data/fakedata.zip",
        missingcoursesfolder: "./test/data/missingcoursesfolder.zip", // no files + no folder
        morecourses: "./test/data/morecourses.zip",
        notazip: "./test/data/file.json",
        rooms: "./test/data/rooms.zip",
        onefilenofolder: "./test/data/onefilenofolder.zip",
        onefileonefolder: "./test/data/onefolderonefile.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToLoad)[i]]: buf.toString("base64") };
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    /* it("Should return something interesting", async () => {
        const id: string = "rooms";
        let response: any;
        try {
            response = await insightFacade.parseRoomsDataset(id, datasets[id]);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.equal("heya");
        }
    }); */

    it("Should parse an HTML file and extract it's building/rooms", async () => {
        const id: string = "rooms";
        const expectedCode: number = 204;
        let response: any;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should reject adding this roomsDataset with the same name", async () => {
        const id: string = "rooms";
        const expectedCode: number = 400;
        let response: any;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should reject adding this roomsDataset with the same id", async () => {
        const id: string = "rooms";
        const expectedCode: number = 400;
        let response: any;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should reject adding this roomsDataset with null id", async () => {
        const id: string = null;
        const expectedCode: number = 400;
        let response: any;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should reject adding this roomsDataset with empty id", async () => {
        const id: string = "";
        const expectedCode: number = 400;
        let response: any;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should add a valid dataset", async () => {
        const id: string = "courses";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should list datasets", async () => {
        const id: string = "courses";
        const expectedCode: number = 200;
        let response: InsightResponse;

        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should not add an invalid dataset", async () => {
        const id: string = "confusion";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            // The body should contain {"error": "my text"}
            // to explain what went wrong. This should also be used if the provided dataset
            // is invalid or if it was added more than once with the same id.
        }
    });

    it("Should not add a valid zip that has empty courses file", async () => {
        const id: string = "morecourses";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            // The body should contain {"error": "my text"}
            // to explain what went wrong. This should also be used if the provided dataset
            // is invalid or if it was added more than once with the same id.
        }
    });

    it("Should not add a valid zip that does not contain any real data", async () => {
        const id: string = "fakedata";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            // The body should contain {"error": "my text"}
            // to explain what went wrong. This should also be used if the provided dataset
            // is invalid or if it was added more than once with the same id.
        }
    });

    it("Should not add a dataset with invalid zip", async () => {
        const id: string = "notazip";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should not add a dataset with no courses folder", async () => {
        const id: string = "missingcoursesfolder";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should not add a dataset with files and no courses folder", async () => {
        const id: string = "onefilenofolder";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should add a dataset with files and folders", async () => {
        const id: string = "onefileonefolder";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should 400 trying to add an existing dataset", async () => { // run consecutively right
        const id: string = "courses";
        const expectedCode: number = 400; // 400; (?) investigate spec
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should not add this rando key", async () => {
        const id: string = "";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should not add a null thing", async () => {
        const id: string = null;
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // This is an example of a pending test. Add a callback function to make the test run.
    // it("Should remove the courses dataset");
    it("Should remove the courses dataset", async () => { // the dataset is there right
        const id: string = "courses";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should reject this remove request", async () => {
        const id: string = "morecourses";
        const expectedCode: number = 404;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should remove the rooms dataset", async () => { // the dataset is there right
        const id: string = "rooms";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should reject this remove request", async () => {
        const id: string = "rooms";
        const expectedCode: number = 404;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });
});

// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToQuery)[i]]: buf.toString("base64") };
            });
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<InsightResponse>> = [];
            const datasets: { [id: string]: string } = Object.assign({}, ...loadedDatasets);
            for (const [id, content] of Object.entries(datasets)) {
                if (id === "courses") {
                    responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Courses));
                } else {
                    responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Rooms));
                }
            }
            // This try/catch is a hack to let your dynamic tests execute enough the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: InsightResponse[] = await Promise.all(responsePromises);
                responses.forEach((response) => expect(response.code).to.equal(204));
            } catch (err) {
                Log.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
            }
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, async () => {
                    let response: InsightResponse;

                    try {
                        response = await insightFacade.performQuery(test.query);
                    } catch (err) {
                        response = err;
                    } finally {
                        Log.trace(JSON.stringify(response));
                        expect(response.code).to.equal(test.response.code);

                        if (test.response.code >= 400) {
                            expect(response.body).to.have.property("error");

                        } else {
                            // expect(response.body).to.have.property("result");
                            // response.body.hasOwnProperty("result");
                            const expectedResult = (test.response.body as InsightResponseSuccessBody).result as any[];
                            const actualResult = (response.body as InsightResponseSuccessBody).result as any[];
                            expect(actualResult).to.deep.include.members(expectedResult);
                        }
                    }
                });
            }
        });
    });
});
