"use strict";

var express = require('express');
var router = express.Router();

var AWS = require('aws-sdk');
var nconf = require('nconf');
var url = require('url');
var request = require('request');

/**
 *  Home page
 */
router.get('/', function (req, res, next) {
    res.render('index', {
        title: 'Express',
        DIGITS_CONSUMER_KEY: nconf.get('DIGITS_CONSUMER_KEY'),
    });
});

/**
 *  POST Digits login - see views/index.ejs
 */
router.post('/digits', function (req, res) {
    var apiUrl = req.body['apiUrl'];
    var credentials = req.body['credentials'];

    // verify the OAuth consumer key
    if (credentials.indexOf('oauth_consumer_key="' + nconf.get('DIGITS_CONSUMER_KEY') + '"') == -1) {
        return res.send({
            error: 'The Digits API key does not match',
        });
    }

    // verify the hostname
    var hostname = url.parse(req.body.apiUrl).hostname;
    if (hostname != 'api.digits.com' && hostname != 'api.twitter.com') {
        return res.send({
            error: 'Invalid API hostname',
        });
    }

    // prepare the request to the Digits API
    var options = {
        url: apiUrl,
        headers: {
            'Authorization': credentials
        }
    };

    // perform the request to the Digits API
    console.log("-", "call", apiUrl);
    request.get(options, function (error, response, body) {
        if (response.statusCode !== 200) {
            error = new Error("bad status code: " + response.statusCode);
        }

        if (error) {
            console.log("#", error.message);
            return res.send({
                error: error.message
            });
        }

        var digitd = JSON.parse(body)
        console.log("-", "result", digitd);

        var userd = {
            name: digitd.phone_number,
            phone: digitd.phone_number,
            digits_id: digitd.id_str,
            id: null,
        };

        if (userd.email_address && userd.email_address.address) {
            userd.email = userd.email_address.address;
        }

        var logind = {
            access_token: digitd.access_token.token + ";" + digitd.access_token.secret,
            user: userd,
        };

        console.log("-", "call cognito_login");
        cognito_login(logind, function (error) {
            if (error) {
                console.log("#", "cognito_login", error.mesage);
                return res.send({
                    error: error.message,
                });
            }

            console.log("-", "cognito_login", userd);
            return res.send(userd);
        });

    });
});

function cognito_login(logind, done) {
    var pool_id = nconf.get("COGNITO_IDENTITY_POOL_ID");

    AWS.config.region = nconf.get("AWS_REGION");
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        AccountId: nconf.get("AWS_ACCOUNT_ID"),
        RoleArn: nconf.get("IAM_ROLE_ARN"),
        IdentityPoolId: pool_id,
        Logins: {
            'www.digits.com': logind.access_token,
        }
    });

    console.log("-", "call credentials.get");
    AWS.config.credentials.get(function (error) {
        if (error) {
            console.log("# credentials.get: " + error, error.stack);
            return done(error, null);
        }

        logind.cognito = {
            id: AWS.config.credentials.identityId,
            pool_id: pool_id,
        }

        logind.user.id = AWS.config.credentials.identityId;

        console.log("- cognito.id ", logind.cognito.id);
        cognito_update_userinfo(logind, done);
    });
}

function cognito_update_userinfo(logind, done) {
    var cognitosync = new AWS.CognitoSync();
    var COGNITO_DATASET_NAME = 'TEST_DATASET';

    var _add = function (syncd) {
        var params = {
            DatasetName: COGNITO_DATASET_NAME,
            IdentityId: logind.cognito.id,
            IdentityPoolId: logind.cognito.pool_id,
            SyncSessionToken: syncd.SyncSessionToken,
            RecordPatches: [{
                Key: 'USER_ID',
                Op: 'replace',
                SyncCount: syncd.DatasetSyncCount,
                Value: "" + logind.user.id,
            }, {
                Key: 'USER_NAME',
                Op: 'replace',
                SyncCount: syncd.DatasetSyncCount,
                Value: logind.user.name,
            }],
        };

        console.log("-", "call cognitosync.updateRecords");
        cognitosync.updateRecords(params, function (error, data) {
            if (error) {
                console.log("# cognitosync.updateRecords", error, error.stack);
                return done(error, null);
            }

            console.log("- cognitosync.updateRecords", JSON.stringify(data)); 
            return done(null, null);
        });
    };

    var _list = function () {
        console.log("-", "call cognitosync.listRecords");
        cognitosync.listRecords({
            DatasetName: COGNITO_DATASET_NAME,
            IdentityId: logind.cognito.id,
            IdentityPoolId: logind.cognito.pool_id
        }, function (error, syncd) {
            if (error) {
                console.log("# cognitosync.listRecords", error, error.stack); 
                return done(error, null);
            }

            console.log("- cognitosync.listRecords", syncd);
            _add(syncd);
        });
    };

    _list();
};

/**
 *  API
 */
module.exports = router;
