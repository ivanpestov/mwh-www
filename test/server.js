const http = require("http");
const debug = require("debug");
const d = debug("server");
let counter = 0;
let timeStampLastRequest = Date.now();

const server = http.createServer(requestListener);

function requestListener(req, res) {
    const now = Date.now();
    const diff = now - timeStampLastRequest;
    timeStampLastRequest = now;
    d(`Interval: ${diff}`);
    const baseUrl = "/test";
    const { host } = req.headers;
    const { url } = req;
    if (url.indexOf(baseUrl) === 0) {
        const nextHref = `http://${host}${baseUrl}/${counter++}`;
        res.end(JSON.stringify({ nextHref }));
    } else {
        res.statusCode = 404;
        res.end();
    }
}


module.exports = server;
