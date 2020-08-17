# www

## Description
Wrapper for native nodejs request for request 
to [JSON API "Мой склад"](https://dev.moysklad.ru/doc/api/remap/1.2/#mojsklad-json-api)
support only get text in utf-8  
The aim of this lib is restrict frequency of request 
according to [documentation](https://dev.moysklad.ru/doc/api/remap/1.2/#mojsklad-json-api-obschie-swedeniq-obrabotka-oshibok)

## Feature
* restrict frequency of request 

## version history

### 0.0.3
 * restrict frequency of request by check header [X-RateLimit-Remaining](https://dev.moysklad.ru/doc/api/remap/1.2/#mojsklad-json-api-obschie-swedeniq-obrabotka-oshibok)

## debug
key for [debug](https://github.com/visionmedia/debug) www:info, www:debug, www:err


