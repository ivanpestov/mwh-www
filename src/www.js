/**
 * Wrapper for native nodejs request
 * response Promise with native node {@link http.IncomingMessage}
 * @module
 */

const validateStatusCode = require("./validateStatusCode");

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

const d = require("debug");
const dInfo = d("www:info");
const dBrk = d("www:break");
const dErr = d("www:err");
const dDebug = d("www:debug");
const http = require("http");
const https = require("https");

let minIntervalForRequest = 50,
    currentMinIntervalForRequest;
let maxNumParallelRequests = 5;
let countParallelRequest = 0;
let remainRequests = Number.MAX_SAFE_INTEGER;
let timeStampLastRequest = Date.now() - minIntervalForRequest;

/**
 *
 * @param {string} url
 * @param {Object} options as native nodejs options for {@link http:request}
 * @param {Object|string} data
 * @return {Promise<response>}
 */
function request(url, options, data) {
    let realData;
    if (
        data &&
        typeof data === "object" &&
        data.constructor.name === "Object"
    ) {
        realData = JSON.stringify(data);
    } else if (typeof data === "string" && data.length > 0) {
        realData = data;
    } else if (typeof data === "undefined") {
        realData = data;
    } else {
        throw new TypeError(`Unsupported type of data: "${typeof data}"`);
    }
    const actualOptions = _validateOptions(options);
    dDebug(`Url: ${url}`);
    let executor = (resolve, reject) => {
        dDebug(`remainRequests = ${remainRequests}`);
        dDebug(`countParallelRequest = ${countParallelRequest}`);
        let countOfBadRequests = 0;
        let web,
            // Обозначает что запрос завершен и результат может быть resolve
            requestIsDone = true;
        if (remainRequests > 90) {
            --currentMinIntervalForRequest;
            currentMinIntervalForRequest =
                currentMinIntervalForRequest <= 0
                    ? 0
                    : currentMinIntervalForRequest;
        } else {
            currentMinIntervalForRequest =
                (currentMinIntervalForRequest || 1) * 1.03;
            currentMinIntervalForRequest =
                currentMinIntervalForRequest > 1000
                    ? 1000
                    : currentMinIntervalForRequest;
        }
        if (!remainRequests) {
            setTimeout(() => {
                dBrk("BRK");
                remainRequests = 100;
            }, 1000);
        }
        if (
            remainRequests > 0 &&
            countParallelRequest < maxNumParallelRequests
        ) {
            startRequest();
        } else {
            setTimeout(executor, currentMinIntervalForRequest, resolve, reject);
        }

        function startRequest() {
            /* eslint-disable-next-line no-empty */
            ++countParallelRequest;
            dDebug(`DiffTime = ${Date.now() - timeStampLastRequest}`);
            timeStampLastRequest = Date.now();
            if (url.indexOf("https:") === 0) {
                web = https;
            } else if (url.indexOf("http:") === 0) {
                web = http;
            } else {
                reject(new Error(`Unsupported protocol for url: "${url}"`));
            }

            const req = web.request(url, actualOptions, (res) => {
                --countParallelRequest;
                let { statusCode, headers } = res;
                const contentLength = headers["content-length"];
                const contentType = headers["content-type"] || "";

                /*
                Support only application/json
                 */
                if (contentType.indexOf("application/json") < 0) {
                    requestIsDone = false;
                    reject(
                        new Error(
                            `Server return unsupported content type request: "${contentType}"`
                        )
                    );
                    return;
                }

                remainRequests = headers["x-ratelimit-remaining"];

                dErr(currentMinIntervalForRequest, remainRequests);
                dDebug(
                    `Get response for url: ${url} code: ${statusCode} message: ${res.statusMessage}`
                );
                dDebug(`content length: ${contentLength}`);

                requestIsDone = validateStatusCode(
                    res,
                    actualOptions,
                    resolve,
                    reject,
                    request,
                    url
                );
                let body = "";
                res.setEncoding("utf-8");
                res.on("data", (data) => {
                    body += data;
                });
                res.on("error", (err) => {
                    err(`Error on response ${err.message}`);
                    if (countOfBadRequests < 2) {
                        countOfBadRequests++;
                        process.nextTick(executor, resolve, reject);
                    } else {
                        reject(err);
                    }
                });
                res.on("end", () => {
                    if (requestIsDone) {
                        res.body = JSON.parse(body);
                        dInfo(
                            `Success response for url: ${url} statusCode: ${statusCode}`
                        );
                        resolve(res);
                    } else {
                        dInfo(
                            `Bad response for url: ${url} statusCode: ${statusCode}`
                        );
                        reject("Cant get body");
                    }
                });
            });
            req.on("error", (e) => {
                dInfo(`Error on request ${e.message}`);
                if (countOfBadRequests < 2) {
                    countOfBadRequests++;
                    process.nextTick(startRequest);
                } else {
                    reject(e);
                }
            });
            if (realData) {
                req.write(realData);
            }
            req.end();
        }
    };
    return new Promise(executor);
}

/**
 *
 * @param {Object} options http options for node request {@link https://nodejs.org/api/http.html#http_http_request_url_options_callback}
 * @param resolve
 * @param reject
 * @private
 * @return {Object}
 */
function _validateOptions(options, resolve, reject) {
    const actualOptions = Object.assign({}, options);
    actualOptions.method = actualOptions.method || "GET";
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
    currentMinIntervalForRequest = c.minIntervalForRequest || 0;
    return request;
};
