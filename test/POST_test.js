const chai = require("chai");
chai.should();
const { expect } = chai;
const nock = require("nock");
const fetch = require("../src/www").getFetch();

const requestBody = {
    "organization": {
        "meta": {
            "href": "https://online.moysklad.ru/api/remap/1.2/entity/organization/850c8195-f504-11e5-8a84-bae50000015e",
            "type": "organization",
            "mediaType": "application/json"
        }
    },
    "processingPlan": {
        "meta": {
            "href": "http://online.moysklad.ru/api/remap/1.2/entity/processingplan/c38e50b0-acdc-11e6-5bed-427b0000009e",
            "metadataHref": "http://online.moysklad.ru/api/remap/1.2/entity/processingplan/metadata",
            "type": "processingplan",
            "mediaType": "application/json"
        }
    },
    "positions": [
        {
            "quantity": 111,
            "assortment": {
                "meta": {
                    "href": "https://online.moysklad.ru/api/remap/1.2/entity/product/eeef177f-f648-11e5-8a84-bae50000007a",
                    "type": "product",
                    "mediaType": "application/json"
                }
            }
        }
    ]
};

const responseBody = {
    "meta": {
        "href": "https://online.moysklad.ru/api/remap/1.2/entity/processingorder/c49e83b3-01af-11e6-9464-e4de00000026",
        "metadataHref": "https://online.moysklad.ru/api/remap/1.2/entity/processingorder/metadata",
        "type": "processingorder",
        "mediaType": "application/json"
    },
    "id": "c49e83b3-01af-11e6-9464-e4de00000026",
    "accountId": "84e60e93-f504-11e5-8a84-bae500000008",
    "syncId": "734a9e26-45a2-4ead-849c-e144daeb854d",
    "updated": "2016-04-14 13:08:58",
    "name": "000034",
    "externalCode": "DAD9peGij6sDNii49Dkam2",
    "owner": {
        "meta": {
            "href": "https://online.moysklad.ru/api/remap/1.2/entity/employee/faba7f37-2e58-11e6-8a84-bae500000028",
            "metadataHref": "https://online.moysklad.ru/api/remap/1.2/entity/employee/metadata",
            "type": "employee",
            "mediaType": "application/json"
        }
    },
    "shared": false,
    "group": {
        "meta": {
            "href": "https://online.moysklad.ru/api/remap/1.2/entity/group/f97aa1fb-2e58-11e6-8a84-bae500000002",
            "metadataHref": "https://online.moysklad.ru/api/remap/1.2/entity/group/metadata",
            "type": "group",
            "mediaType": "application/json"
        }
    },
    "moment": "2016-04-19 13:50:24",
    "applicable": false,
    "sum": 0,
    "organization": {
        "meta": {
            "href": "https://online.moysklad.ru/api/remap/1.2/entity/organization/850c8195-f504-11e5-8a84-bae50000015e",
            "metadataHref": "https://online.moysklad.ru/api/remap/1.2/entity/organization/metadata",
            "type": "organization",
            "mediaType": "application/json"
        }
    },
    "state": {
        "meta": {
            "href": "https://online.moysklad.ru/api/remap/1.2/entity/processingorder/metadata/states/fb56c504-2e58-11e6-8a84-bae500000069",
            "type": "state",
            "mediaType": "application/json"
        }
    },
    "organizationAccount": {
        "meta": {
            "href": "https://online.moysklad.ru/api/remap/1.2/entity/organization/850c8195-f504-11e5-8a84-bae50000015e/accounts/3a30e844-016f-11e6-9464-e4de00000068",
            "type": "account",
            "mediaType": "application/json"
        }
    },
    "created": "2007-02-07 17:16:41",
    "positions": {
        "meta": {
            "href": "https://online.moysklad.ru/api/remap/1.2/entity/processingorder/c49e83b3-01af-11e6-9464-e4de00000026/positions",
            "metadataHref": "https://online.moysklad.ru/api/remap/1.2/entity/processingorder/metadata",
            "type": "processingorderposition",
            "mediaType": "application/json",
            "size": 1,
            "limit": 1000,
            "offset": 0
        }
    },
    "quantity": 5,
    "processingPlan": {
        "meta": {
            "href": "http://online.moysklad.ru/api/remap/1.2/entity/processingplan/c38e50b0-acdc-11e6-5bed-427b0000009e",
            "metadataHref": "http://online.moysklad.ru/api/remap/1.2/entity/processingplan/metadata",
            "type": "processingplan",
            "mediaType": "application/json"
        }
    }
};

let url;

describe("POST", function() {
    const [user, pass] = process.env.MWH_AUTH.split(":");
    let scope;
    before(function() {
        url = process.env.MWH_URL;
        if (!url) throw new Error(`MWH_URL is not set!`);
        scope = nock(url)
            .defaultReplyHeaders({ "content-type": "application/json;charset:utf-8" })
            .post(/entity\/processingorder$/)
            .basicAuth({user, pass})
            // .basicAuth({ user, pass })
            .reply(200, responseBody);
    });
    after(function() {
        return expect(scope.isDone()).is.true;
    });
    it("POST entity/processingorder", async function() {
        let options = {
            method: "POST",
            headers: { "content-type": "application/json;charset:utf-8" },
            auth: `${user}:${pass}`,
            path: 'entity/processingorder'
        };
        const response = await fetch(`${url}`,
            options, requestBody);
        response.body.should.to.nested.property("id");
    });
});
