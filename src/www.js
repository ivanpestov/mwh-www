const zlib = require('node:zlib');
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


// value from response header "x-lognex-retry-timeinterval"
const  MWH_RETRY_TIMEINTERVAL = process.env.MWH_RETRY_TIMEINTERVAL * 1;
// value from response header "x-ratelimit-limit"
const  MWH_LIMIT  = process.env.MWH_LIMIT * 1;
const  MWH_MAX_NUM_PARALLEL_REQUESTS  = process.env.MWH_MAX_NUM_PARALLEL_REQUESTS * 1;
const  MWH_MIN_EDGE_TO_SPEED_UP_COEFICIENT  = process.env.MWH_MIN_EDGE_TO_SPEED_UP_COEFICIENT * 1;

if(! MWH_RETRY_TIMEINTERVAL > 0) {
  throw new Error('Environment variable "MWH_RETRY_TIMEINTERVAL" is not defined');
}
if(! MWH_LIMIT > 0) {
  throw new Error('Environment variable "MWH_LIMIT" is not defined');
}
if(! MWH_MAX_NUM_PARALLEL_REQUESTS > 1) {
  throw new Error('Environment variable "MWH_MAX_NUM_PARALLEL_REQUESTS" is not defined');
}
if(! MWH_MIN_EDGE_TO_SPEED_UP_COEFICIENT > 0.1) {
  throw new Error('Environment variable "MWH_MIN_EDGE_TO_SPEED_UP_COEFICIENT" is not defined');
}



let minIntervalForRequest = parseInt(MWH_RETRY_TIMEINTERVAL/MWH_LIMIT) + 1,
    currentMinIntervalForRequest;
const MIN_EDGE_TO_SPEED_UP = parseInt(minIntervalForRequest * MWH_MIN_EDGE_TO_SPEED_UP_COEFICIENT)
const RATE_TO_SPEED_DOWN = 1.03;
let countParallelRequest = 0;
let remainRequests = Number.MAX_SAFE_INTEGER;
let timeStampLastRequest = Date.now() - minIntervalForRequest;

console.log('\n%s', JSON.stringify({MWH_RETRY_TIMEINTERVAL, MWH_LIMIT, minIntervalForRequest}));

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
        (data.constructor.name === "Object" || data.constructor.name === "Array")
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
        if (remainRequests > MIN_EDGE_TO_SPEED_UP) {
            --currentMinIntervalForRequest;
            currentMinIntervalForRequest =
                currentMinIntervalForRequest <= 0 ? 0 : currentMinIntervalForRequest;
        } else {
            currentMinIntervalForRequest = (currentMinIntervalForRequest || 1) * RATE_TO_SPEED_DOWN;
            currentMinIntervalForRequest =
                currentMinIntervalForRequest > 1000 ? 1000 : currentMinIntervalForRequest;
        }
        if (!remainRequests) {
            setTimeout(() => {
                dBrk("BRK");
                remainRequests = minIntervalForRequest;
            }, MWH_RETRY_TIMEINTERVAL * 1.05);
        }
        if (remainRequests > 0 && countParallelRequest < MWH_MAX_NUM_PARALLEL_REQUESTS) {
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
                let { statusCode, headers, statusMessage } = res;
                const contentLength = headers["content-length"];
                const contentType = headers["content-type"] || "";
                if (headers.location) {
                  url = headers.location
                  delete actualOptions.path
                  delete actualOptions.auth
                  dInfo('Redirect to "%s"', url)
                  dInfo('Optios is: %o', options)
                  startRequest()
                  return
                }

                if (statusCode >= 300) {
                    requestIsDone = false;
                    dDebug(res)
                    reject(
                        new Error( `Server return error statusCode : "${statusCode}" ` +
                            `statusMessage: ${statusMessage}` +
                                `headers is: ${JSON.stringify(headers)}`)
                    );
                    return;
                }

                /*
                Support only application/json and image
                 */
                if (!contentType.includes("json") && !contentType.includes('image')) {
                    requestIsDone = false;
                    reject(
                        new Error(
                            `Server return unsupported content type : "${contentType}" ` +
                            `statusCode: ${statusCode}, statusMessage: ${statusMessage}` +
                                `headers is: ${JSON.stringify(headers)}`
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
                let bufferChunks = [];
                let lentthCount = 0;
                res.on("data", (data) => {
                    bufferChunks.push(data)
                    dInfo('data.length = %d', data.length)
                    lentthCount += data.length
                });
                res.on("error", (err) => {
                    if (countOfBadRequests < 2) {
                        countOfBadRequests++;
                        process.nextTick(executor, resolve, reject);
                    } else {
                        reject(err);
                    }
                });
                res.on("end", () => {
                    if (!requestIsDone) {
                        dInfo(`Bad response for url: ${url} statusCode: ${statusCode}`);
                        reject("Cant get body");
                      return
                    }
                    const responseBodyBuffer = Buffer.concat(bufferChunks)
                    if ((res.headers['content-encoding'] || '').includes('gzip')) {
                      zlib.gunzip(responseBodyBuffer, null, (err, buffer) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        _resolveWithContent(buffer, contentType, url, statusCode, res, resolve, reject);
                      });
                    } else {
                        _resolveWithContent(responseBodyBuffer, contentType, url, statusCode, res, resolve, reject);
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
function _validateOptions(options) {
    const actualOptions = Object.assign({}, options);
    actualOptions.method = actualOptions.method || "GET";
    actualOptions.headers = actualOptions.headers || {};
    actualOptions.headers['Accept-Encoding'] = 'gzip';
    return actualOptions;
}

function _resolveWithContent(responseBodyBuffer, contentType, url, statusCode, res, resolve, reject) {
    if (contentType.includes('json')) {
      res.body = JSON.parse(responseBodyBuffer.toString('utf-8'))
      dInfo(`Success response for url: ${url} statusCode: ${statusCode}`);
    } else if (contentType.includes('image')) {
      res.body = responseBodyBuffer
      dInfo({ lentthCount })
    } else {
      reject(new Error('Unexpected behavior. Content type must be a image or json'))
    }
    resolve(res);
}

/**
 *
 * @param {Object} [conf]
 * @param {int} [conf.minIntervalForRequest=0] - for restricting interval between
 * requests
 * @return {Promise<request>}
 */
exports.getFetch = function getFetch(conf) {
    const c = Object.assign({}, conf);
    currentMinIntervalForRequest = c.minIntervalForRequest || 0;
    return request;
};

