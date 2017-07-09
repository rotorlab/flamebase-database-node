[ ![flamebase/flamebase-database-node](https://d25lcipzij17d.cloudfront.net/badge.svg?id=js&type=6&v=1.3.0&x2=0)](https://www.npmjs.com/package/flamebase-database-node)
# :fire: flamebase-database-node

Real time JSON database (server node).

### What is this?
Flamebase is an open source project that tries to emulate Firebase Database features as much as possible. I like Firebase but it's expensive for what it currently offers.
If you are doing an altruist project with Firebase, pray not to became successful, because the monthly amount will increase considerably.

In this repo you can find the proper package for work with json db as flamebase-database-server-cluster does.
For now it still developing, so please be patient with errors.

### Usage

- Import library:

```javascript
var FlamebaseDatabase = require("flamebase-database-node");
```
- Define database and reference to instance as JSON object: 
```javascript
var database    = "chats";      // database's name
var path        = "groupA";    // path to JSON reference
var FD          = new FlamebaseDatabase(database, "/" + path);
FD.syncFromDatabase();          // first load
```
Now `FD.ref` is `groupA` JSON object.

- Do some work and sync:
This JSON reference (`groupA`) contains this information:
```json
{
    "people": {
        "john_travolta@ddd.com": {
            "name": "John Travolta",
            "token": "AsDadfsdfsDFCGsdfgEgWEcgcEgcwEgWegwEgeGWHTrydhdfsDFCGsdfgEgWEcgcEgcwEgWegwEgrty",
            "os": "android"
        },
        "donal_duck@aaa.com": {
            "name": "Donal Duck",
            "token": "DSfgsfgSgrtuyjYuIKyUyjRtyFytrydhdfsDFCGsdfgEgWEcgcEfgSgrtuyjYuIgcwEgWegwEgrty",
            "os": "android"
        }
    },
    "messages": {
        "1495171941114": {
            "author": "john_travolta@ddd.com",
            "text": "Message 1"
        },
        "1495171941127": {
            "author": "donal_duck@aaa.com",
            "text": "Message 2"
        },
        "1495171941159": {
            "author": "john_travolta@ddd.com",
            "text": "Message 3"
        },
        "1495171941327": {
            "author": "donal_duck@aaa.com",
            "text": "Message 4"
        }
    }
}
```
For insert new messages on this conversation compose a new message JSON object:
```javascript
var message = {};
message.author = "john_travolta@ddd.com";
message.text = "Message 5";

var messageId = new Date().getTime() + "";
 
FD.ref.messages[messageId] = message;

FD.syncToDatabase();
```
At this point we have a JSON reference synchronized with our JSON database.

Define some configuration properties to keep devices up to date when JSON reference changes.
```javascript
var config = {};

/** 
* server API key for firebase cloud messaging
*/
config.APIKey = function() {
    return "GsdfgSVDfvsdAwejhFDGhbdASD"; // server key - FCM
};

/** 
* all device objects must have token and os info in order
* to slice big JSON changes for android or ios push notifications
*/
config.devices = function() {
    var devices = [];
    var keys = Object.keys(FD.ref.people);
    for (var i = 0; i < people.length; i++) {
        var person = FD.ref.people[keys[i]];
        
        var device = {};
        device.token = person.token;
        device.os = person.os;
        
        devices.push(device);
    }
    return devices;
};

/** 
* tag that informs android/ios client which action is being called
*/
config.tag = function() {
    return path + "_sync"; // groupA_sync
};

/**
* custom id for client database (used as primary key)
*/
config.referenceId = function() {
    return path; // groupA
};

/**
* custom notification to send when database reference changes.
* return null if not needed
*/
config.notification = function() {
    return {
        type: path + "_type",           // notification type
        name: "Database changed",       // name or text message
        image: "http://..."             // image url to show on left notification icon
    }
};

FD.setSyncConfig(config);
```
Now all reference changes are sent every time you call `FD.syncToDatabase()`. It only sends changes.

For sending full reference:
```javascript
FD.syncToDatabase(true);
```
Control synchronization process:
```javascript
FD.syncToDatabase(false, function() {
    // data is stored and all push messages has been sent
    console.log("data stored and differences sent!")
});
```
- Enable debug logs:
```javascript
FD.debug(true);
```
