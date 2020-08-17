/**
 * Wrapper for native nodejs request
 * response Promise with native node {@link http.IncomingMessage}
 * @module www
 */

/**
 * It's extend nodejs {@link http.IncomingMessage} with property "body" as string
 * parsed from nodes's http.incomingMessage with encoding utf-8
 *
 * Contains all properties {@link http.IncomingMessage}
 *
 * @typedef {Object} response
 * @extends http.IncomingMessage
 * @property {string} body
 *
 */

const debug = require("debug");
const dGet = debug("get:info");
const dGetDebug = debug("get:debug");
const http = require("http");
const https = require("https");

let minIntervalForRequest = 5;
let timeStampLastRequest = Date.now() - minIntervalForRequest;

/**
 *
 * @param res
 * @param options
 * @param resolve
 * @param reject
 * @private
 * @return {boolean}
 */
function validateStatusCode(res, options, resolve, reject) {
    let requestIsDone = true;
    const { headers, statusCode } = res;
    const location = headers["location"];
    switch (statusCode) {
        case 200:
        case 202:
        case 201:
            break;
        case 301:
        case 302:
        case 303:
        case 307:
        case 308:
            requestIsDone = false;
            dGet(
                `Redirect url: ${url} statusCode: ${statusCode}`
            );
            get(location, options).then(resolve, reject);
            break;
        case 401:
            reject(new Error(`Unauthorized ${headers["www-authenticate"]}`));
            break;
        default:
            dGetDebug(`StatusCode: ${statusCode}`);
    }
    return requestIsDone;
}


/**
 *
 * @param {string} url
 * @param {object} options as native nodejs options for {@link http:request}
 * @return {Promise<response>}
 */
function request(url, options) {
    dGetDebug(`Url: ${url}`);
    return new Promise(async (resolve, reject) => {
        const actualOptions = validateOptions(options, resolve, reject);
        actualOptions.method = actualOptions.method || 'GET';
        let countOfBadRequests = 0;
        let web,
            // Обозначает что запрос завершен и результат может быть resolve
            requestIsDone = true;
        startRequest();

        function startRequest() {
            while (Date.now() - timeStampLastRequest < minIntervalForRequest) {
            }
            dGetDebug(`DiffTime = ${Date.now() - timeStampLastRequest}`);
            timeStampLastRequest = Date.now();
            if (url.indexOf("https:") === 0) {
                web = https;
            } else if (url.indexOf("http:") === 0) {
                web = http;
            } else {
                reject(new Error(`Unsupported protocol for url: "${url}"`));
            }

            const req = web.get(url, options || {}, (res) => {
                let { statusCode, headers } = res;
                const contentLength = headers["content-length"];
                dGetDebug(
                    `Get response for url: ${url} code: ${statusCode} message: ${res.statusMessage}`
                );
                dGetDebug(`content length: ${contentLength}`);
                requestIsDone = validateStatusCode(res, options, resolve, reject);
                let body = "";
                res.setEncoding("utf-8");
                res.on("data", (data) => {
                    body += data;
                });
                res.on("error", (err) => {
                    dGet(`Error on response ${err.message}`);
                    if (countOfBadRequests < 2) {
                        countOfBadRequests++;
                        process.nextTick(startRequest);
                    } else {
                        reject(err);
                    }
                });
                res.on("end", () => {
                    res.body = body;
                    if (requestIsDone) {
                        dGet(
                            `Success response for url: ${url} statusCode: ${statusCode}`
                        );
                        resolve(res);
                    } else {
                        dGet(
                            `Bad response for url: ${url} statusCode: ${statusCode}`
                        );
                        reject("Cant get body");
                    }
                });
            });
            req.on("error", (e) => {
                dGet(`Error on request ${e.message}`);
                if (countOfBadRequests < 2) {
                    countOfBadRequests++;
                    process.nextTick(startRequest);
                } else {
                    reject(e);
                }
            });
        }
    });
}

/**
 *
 * @param {Object} options
 * @param resolve
 * @param reject
 * @return {any}
 */
function validateOptions(options, resolve, reject){
    const actualOptions = Object.assign({}, options);
    actualOptions.method = actualOptions.method || 'GET';
    return actualOptions;
}

/**
 *
 * @param {Object} [conf]
 * @param {int} [conf.minIntervalForRequest=0] - for restricting interval between
 * requests
 * @return {request}
 */
exports.getFetch = function getFetch(conf) {
    const c = Object.assign({}, conf);
    minIntervalForRequest = c.minIntervalForRequest || 0;
    return request;
};
