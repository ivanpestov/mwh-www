const debug = require("debug");
const dRoot = debug("client");
const server = require("./server");
const www = require("../src/www");
const get = www.getFetch();
let limit = 1000,
    href = "http://localhost:8080/test";
// href = `https://online.moysklad.ru/api/remap/1.2/entity/customerorder?limit=${1}`;

const options = {
    auth: "admin@wcs:13vfhnf1989",
    headers: {},
};

server.on("connect", (e) => {});

function testCuncarentStyle() {
    server.listen({ port: 8080, host: "localhost" }, () => {
        console.log(`Server listen`);
        dRoot(`Start requests...`);
        Promise.all(getListUrls(href, limit)).then(
            (responses) => {
                const result = responses
                    .map((r) => JSON.parse(r.body))
                    .map((b) => !!b)
                    .reduce((accum, cur) => accum && cur, true);
                console.log(result);
                // console.log(responses.map(r => formatResponse(r)));
                dRoot(`End requests`);
                server.close();
            },
            (err) => {
                console.log(err.message);
                server.close();
            }
        );
    });
}

// testCuncarentStyle();

function* generatorDocs(limit) {
    for (let i = 0; i < limit; i++) {
        yield get(href, options);
    }
}

async function testSequencyStyle() {
    dRoot("Start Sequency style");
    for await (let i of generatorDocs(limit)) {
        console.log(i.statusCode);
    }
    dRoot("End Sequency style");
}

// testSequencyStyle();

function formatResponse(res) {
    const h = res.headers;
    // return `limit: ${h["x-ratelimit-limit"]} interval: ${h["x-lognex-retry-timeinterval"]}`;
    return (
        `${res.statusCode} remaining: ${h["x-ratelimit-remaining"] || ""}` +
        ` reset: ${h["x-lognex-reset"]}/${h["x-lognex-retry-after"]}`
    );
}

/**
 *
 * @param href
 * @param options
 */
function getResponses(href, options) {
    return get(href, options);
}

async function testSingleRequest() {
    const resp = await getResponses(
        "https://online.moysklad.ru/api/remap/1.2/entity/employee",
        options
    );
    console.log();
}
testSingleRequest();

function getListUrls(url, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
        list.push(url);
    }
    return list.map((e) => get(e, options));
}
