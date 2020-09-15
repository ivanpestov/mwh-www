const d = require("debug");
const info = d("www:info");
const debug = d("www:debug");

/**
 *
 * @param {http.IncomingMessage} res
 * @param {Object} options for http.request()
 * @param {function} resolve callback of Promise
 * @param {function} reject callback of Promise
 * @param {function} request for call recursive itself if redirect
 * @param {string} url
 // * @alias module:www~validateStatusCode
 * @private
 * @return {boolean}
 */
function validateStatusCode(res, options, resolve, reject, request, url) {
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
            info(`Redirect url: ${url} statusCode: ${statusCode}`);
            request(location, options).then(resolve, reject);
            break;
        case 401:
            reject(new Error(`Unauthorized ${headers["www-authenticate"]}`));
            break;
        default:
            debug(`StatusCode: ${statusCode}`);
    }
    return requestIsDone;
}

module.exports = validateStatusCode;
