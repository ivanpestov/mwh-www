const chai = require("chai");
chai.should();
const fetch = require("../src/www").getFetch();

let url;

describe("GET", function () {
    const [user, pass] = process.env.MWH_AUTH.split(":");
    before(function () {
        url = process.env.MWH_URL;
        if (!url) throw new Error(`MWH_URL is not set!`);
    });
    it.only("GET entity/webhook", async function () {
        let options = {
            method: "GET",
            headers: { "content-type": "application/json;charset:utf-8" },
            auth: `${user}:${pass}`,
            path: "/api/remap/1.2/entity/webhook",
        };
        const response = await fetch(`${url}`, options);
        // console.log(response.body);
        response.body.should.to.nested.property("meta");
    });
});
