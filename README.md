# :fire: flamebase-database-node

Real time JSON database server-side. 

### Usage

```javascript
var FlamebaseDatabase = require("flamebase-database-node");

var database    = "myDatabase"; // name of db
var path        = "cars/";      // path to JSON reference

/**
* db reference
*/
var FD      = new FlamebaseDatabase(database, path);
var queue   = FD.getQueue();

/**
* load JSON reference on FD.ref
*/
FD.syncFromDatabase();

var object = this;

/**
* devices to keep up to date
*/
var devices = [];

var deviceA = {};
deviceA.token = "TOKEN_DEVICE_A";
deviceA.os = FC.OS.ANDROID;

devices.push(deviceA);


// ################ ios lib not ready yet
var deviceB = {};
deviceB.token = "TOKEN_DEVICE_B";
deviceB.os = FC.OS.IOS;

devices.push(deviceB);

/**
* config db synchronization
*/
this.setConfig = function() {
    
    /**
    * config for db synchronization (server - client)
    * @type {{}}
    */
    var config = {};
    
    /**
    * server notification key
    */
    config.APIKey = function() {
        return "YOUR_FCM_PUSH_KEY"; // server key - FCM
    };
    
    /**
    * devices to keep up to date
    */
    config.devices = function() {
        return devices;
    };

    /**
    * custom tag for sync
    * - used in android client
    */
    config.tag = function() {
        return "user_sync";
    };

    /**
    * custom id for database reference
    * - used in android client
    */
    config.referenceId = function() {
        return "CUSTOM_ID";
    };

    /**
    * custom notification info to send when database reference changes.
    * set null if not needed
    *     
    * - used in android client
    * 
    * config.notification = null;
    */
    config.notification = function() {
        return {
            type: "custom_type",
            name: object.FD.ref.name,
            image: object.FD.ref.photoURL
        }
    };

    /**
    * sync config
    */
    FD.setSyncConfig(config);
    
    /**
    * enable debug logs
    */
    FD.debug(true);
};
```