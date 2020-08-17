const debug = require("debug");
const d = debug("client");
const server = require("./server");
const www = require("../src/www");
const get = www({})
let counter = 0,
    limit = 1,
    // href = "http://localhost:8080/test";
    href = "https://online.moysklad.ru/api/remap/1.2/entity/customerorder?limit=1";

const options = {
    auth: "admin@wcs:13vfhnf1989",
    headers: {},
};

server.on("connect", (e) => {
});

// server.listen({ port: 8080, host: "localhost" }, () => {
// console.log(`Server listen`);
d(`Start requests...`);
Promise.all(getResponses(href, limit)).then(responses => {
    d(`End requests`);
    console.log(responses.map(r => JSON.parse(r.body).meta.href));
    server.close();
}, err => {
    console.log(err.message);
    server.close();
});

// });

/**
 *
 * @param href
 * @param num
 */
function getResponses(href, num) {
    let responses = [];
    for (let i = 0; i < num; i++) {
        responses.push(get(href));
    }
    return responses;
}

