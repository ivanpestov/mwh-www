const fs = require('fs')
const debug = require('debug')('test')
const chai = require("chai");
chai.should();
const { expect } = chai;
const nock = require("nock");
const fetch = require("../src/www").getFetch();

const url = process.env.MWH_URL;

describe("GET IMAGE", function () {
    const path = 'https://online.moysklad.ru/api/remap/1.2/download/ed8310cc-8ec4-4e60-b644-53d6b31f4a15'
    const [user, pass] = process.env.MWH_AUTH.split(":");
    let scope;
    before(function () {
    });
    after(function () {
    });
    it(`GET ${path}`, async function () {
        let options = {
            method: "GET",
            auth: `${user}:${pass}`,
        };
        const { body, headers, statusCode } = await fetch(path, options);
        debug({ body, headers, statusCode })
        debug('body length: %d', body.length)
        fs.writeFile('test.jpg', body, () => {})
    });
});
