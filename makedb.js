
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

// MongoClient.connect(url, function(err, db) {
//   if (err) throw err;
//   var dbo = db.db("amtbot");
//   dbo.createCollection("ork_ids", function(err, res) {
//     if (err) throw err;
//     console.log("Collection created!");
//     db.close();
//   });
// });

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("amtbot");
    dbo.collection("ork_ids").findOne({ discord_id: "690220d996489117740" }, function(err, result) {
      if (err) throw err;
      console.log(JSON.stringify(result));
      db.close();
    });
  });

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("amtbot");
    var myobj = { discord_id: "690220996489117740", ork_id: "lord_kismet_shenchu" };
    dbo.collection("ork_ids").insertOne(myobj, function(err, res) {
      if (err) throw err;
      console.log("1 document inserted");
      db.close();
    });
});