
var SN = require('sync-node');
var JsonDB = require('node-json-db');
var FCM = require('fcm-push');
var diff = require('rus-diff').diff;
var log4js = require('log4js');

const TAG = "Flamebase Database";
var logger = log4js.getLogger(TAG);

JSON.stringifyAligned = require('json-align');

var ACTION_SIMPLE_UPDATE    = "simple_update";
var ACTION_SLICE_UPDATE     = "slice_update";

function FlamebaseDatabase(database, path) {

    // object reference
    var object = this;

    // debug
    this.debugVal = false;

    // os
    this.OS = {};
    this.OS.ANDROID = "android";
    this.OS.IOS = "ios";

    var lengthMargin = 400; // supposed length of additional info to send
    this.lengthLimit = {};
    this.lengthLimit.ANDROID = (4096 - lengthMargin);
    this.lengthLimit.IOS = (2048 - lengthMargin);

    // sync queue
    this.queue = SN.createQueue();

    // database
    this.db = new JsonDB(database, true, true);

    // db reference
    this.ref = {};

    // last db string reference
    this.lastStringReference = JSON.stringify({});
    this.pushConfig = null;
    this.fcm = null;

    //db sync status
    this.synchronizingToDatabase = false;    // sync data towards db
    this.synchronizingFromDatabase = false;  // sync data  from   db

    /**
     * sync from database
     */
    this.syncFromDatabase = function() {
        this.queue.pushJob(function(){
            return new Promise(function (resolve, reject) {
                object.synchronizingFromDatabase = true;
                try {
                    console.log("####################### data path: " + path);
                    object.ref = object.db.getData(path);
                    object.synchronizingFromDatabase = false;
                    object.syncNotifications();
                    resolve()
                } catch(e) {
                    console.log("####################### data error: " + e);
                    object.db.delete(path);
                    object.ref = {};
                    object.synchronizingFromDatabase = false;
                    resolve();
                }
            })
        });
    };

    /**
     * sync to database
     */
    this.syncToDatabase = function() {
        this.queue.pushJob(function(){
            return new Promise(function (resolve, reject) {
                object.synchronizingToDatabase = true;
                try {
                    object.db.push(path, object.ref);
                    object.synchronizingToDatabase = false;
                    object.syncNotifications();
                    resolve()
                } catch(e) {
                    console.log("####################### data error : " + e);
                    object.synchronizingToDatabase = false;
                    resolve();
                }
                // if (debug) console.info(TAG + " to: " + JSON.stringify(object.ref))
            })
        });
    };

    /**
     * config for real time synchronization
     * @param config
     */
    this.setSyncConfig = function(config) {
        this.pushConfig = config;

        // push notifications
        if (this.fcm === null) {
            this.fcm = (this.pushConfig.APIKey() === null || this.pushConfig.APIKey() === 0 ? null : new FCM(this.pushConfig.APIKey()));
        }

        this.lastStringReference = JSON.stringify({});
    };

    /**
     * debug logs
     * @param callback
     */
    this.debug = function(value) {
        this.debugVal = value;
    };

    /**
     * fired if fcm is defined and DB changes or reloads
     */
    this.syncNotifications = function() {
        if (this.pushConfig !== null && this.fcm !== null) {
            try {
                this.sendDetailPushMessage();
            } catch (e) {
                logger.error("error: " + e);
            }
        }
    };

    /**
     *
     */
    this.sendDetailPushMessage = function() {

        var ios_tokens = [];
        var android_tokens = [];

        var id = this.pushConfig.referenceId();
        var notification = this.pushConfig.notification();
        var devices = this.pushConfig.devices();

        for (var t = 0; t < devices.length; t++) {
            var device = devices[t];
            if (device.os.indexOf(this.OS.IOS) !== -1) {
                ios_tokens.push(device.token);
            } else {
                android_tokens.push(device.token);
            }
        }

        var data_android = this.getPartsFor(this.OS.ANDROID);
        var data_ios = this.getPartsFor(this.OS.IOS);

        if (object.debugVal) {
            logger.debug("android_tokens_size: " + android_tokens.length);
            logger.debug("ios_tokens_size: " + ios_tokens.length);
            logger.debug("data_android_size: " + data_android.parts.length);
            logger.debug("data_ios_size: " + data_ios.parts.length);
        }

        this.lastStringReference = JSON.stringify(this.ref);

        if (android_tokens.length > 0) {
            if (data_android.parts.length === 1) {
                var data = {};
                data.id = id;
                data.tag = this.pushConfig.tag();
                data.reference = data_android.parts[0];
                data.action = ACTION_SIMPLE_UPDATE;
                data.size = data_android.parts.length;
                data.index = 0;
                var send = {};
                send.data = data;
                send.tokens = android_tokens;
                send.notification = notification;
                this.sendPushMessage(send);
            } else if (data_android.parts.length > 1) {
                for (var i = 0; i < data_android.parts.length; i++) {
                    var dat = {};
                    dat.id = id;
                    dat.tag = this.pushConfig.tag();
                    dat.reference = data_android.parts[i];
                    dat.action = ACTION_SLICE_UPDATE;
                    dat.index = i;
                    dat.size = data_android.parts.length;
                    var sen = {};
                    sen.data = dat;
                    sen.tokens = android_tokens;
                    sen.notification = notification;
                    this.sendPushMessage(sen);
                }
            }
        }

        if (ios_tokens.length > 0) {
            if (data_ios.parts.length === 1) {
                var da = {};
                da.id = id;
                da.tag = this.pushConfig.tag();
                da.reference = data_ios.parts[0];
                da.action = ACTION_SIMPLE_UPDATE;
                da.size = data_ios.parts.length;
                da.index = 0;
                var se = {};
                se.data = da;
                se.tokens = ios_tokens;
                se.notification = notification;
                this.sendPushMessage(se);
            } else if (data_ios.parts.length > 1) {
                for (var i = 0; i < data_ios.parts.length; i++) {
                    var d = {};
                    d.id = id;
                    d.tag = this.pushConfig.tag();
                    d.reference = data_ios.parts[i];
                    d.action = ACTION_SLICE_UPDATE;
                    d.index = i;
                    d.size = data_ios.parts.length;
                    var s = {};
                    s.data = d;
                    s.tokens = ios_tokens;
                    s.notification = notification;
                    this.sendPushMessage(s);
                }
            }
        }
    };

    this.sendPushMessage = function(send) {
        this.queue.pushJob(function(){
            return new Promise(function (resolve, reject) {
                var message = {
                    registration_ids: send.tokens, // required fill with device token or topics
                    data: send.data,
                    notification: send.notification
                };

                if (object.debugVal) {
                    logger.debug("Sending to: " + JSON.stringifyAligned(message.registration_ids));
                }

                object.fcm.send(message)
                    .then(function(response){
                        if (object.debugVal) {
                            logger.debug("Successfully sent with response: " + JSON.stringifyAligned(JSON.parse(response)));
                        }
                        resolve();
                    })
                    .catch(function(err){
                        logger.error("error: " + JSON.stringifyAligned(err));
                        resolve();
                    })
            })
        });
    };

    this.getPartsFor = function(os) {
        var notification = this.pushConfig.notification();
        var notificationLength = JSON.stringify(notification).length;

        var differences = JSON.stringify(diff(JSON.parse(this.lastStringReference), this.ref));
        differences = this.string2Hex(differences);
        var partsToSend = [];
        var limit = os.indexOf(this.OS.IOS) !== -1 ? this.lengthLimit.IOS - notificationLength : this.lengthLimit.ANDROID - notificationLength;
        if (differences.length > limit) {
            var index = -1;
            var pendingChars = differences.length;
            while (pendingChars > 0) {
                index++;
                var part = differences.slice(index * limit, (pendingChars < limit ? index * limit + pendingChars : (index + 1) * limit));
                pendingChars = pendingChars - part.length;
                partsToSend.push(part);
            }
        } else {
            partsToSend.push(differences);
        }

        var result = {};
        result.parts = partsToSend;
        return result;
    };

    this.getQueue = function() {
        return this.queue
    };

    this.isSynchronizing = function() {
        return this.synchronizingToDatabase || this.synchronizingFromDatabase
    };

    this.exist = function() {
        return !(this.ref === null || this.ref === undefined)
    };

    this.string2Hex = function (tmp) {
        var str = '';
        for (var i = 0; i < tmp.length; i++) {
            str += tmp[i].charCodeAt(0).toString(16);
        }
        return str;
    };
}

module.exports = FlamebaseDatabase;