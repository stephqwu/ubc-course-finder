import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
const expect = require("chai").expect;

import chaiHttp = require("chai-http");
import * as fs from "fs";
import Log from "../src/Util";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        server.start();
    });

    after(function () {
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    it("PUT test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .end()
                .then(function (res: ChaiHttp.Response) {
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.info("Failed test with err: " + err);
        }
    });

    it("PUT test for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", fs.readFileSync("./test/data/rooms.zip"), "rooms.zip")
                .end()
                .then(function (res: ChaiHttp.Response) {
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.info("Failed test with err: " + err);
        }
    });

    it("GET test for datasets", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res: ChaiHttp.Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.info("Failed test with err: " + err);
        }
    });

    it("DELETE test for courses datasets", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: ChaiHttp.Response) {
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.info("Failed test with err: " + err);
        }
    });

    it("DELETE test for rooms datasets", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/rooms")
                .then(function (res: ChaiHttp.Response) {
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.info("Failed test with err: " + err);
        }
    });
});
