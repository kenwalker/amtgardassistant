const {Client, MessageAttachment, MessageCollector} = require("discord.js");
const FuzzySort = require("./fuzzysort.js");
const jsork = require("./jsork.js");
const https = require('https');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var dbo = null;
var launchTime = Date.now();
var totalMessages = 0;
var totalAttendances = 0;
var largestAttendance = 0;
var largestAttendanceServer = "(No attendances yet)";
var largestAttendanceEventname = "(No attendances yet)";
var allClasses = [
    'Anti-Paladin',
    'Archer',
    'Assassin',
    'Barbarian',
    'Bard',
    'Color',
    'Druid',
    'Healer',
    'Monk',
    'Monster',
    'Paladin',
    'Peasant',
    'Reeve',
    'Scout',
    'Warrior',
    'Wizard'
];


MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    dbo = db.db("amtbot");
    dbo.createCollection("ork_ids", function (err, res) {
        // if (err) throw err;
    });
    dbo.createCollection("attendance", function (err, res) {
        // if (err) throw err;
    });
    // dbo.collection("bardic").drop();
    dbo.createCollection("bardic", function (err, res) {
        // if (err) throw err;
    });
});

const client = new Client();

const config = require("./config.json");
// config.token contains the bot's token.
// config.prefix contains the message prefix.
// config.app contains the app name that is triggered after the prefix.

var allSpells = require('./spells.json');

client.on("ready", () => {
    client.user.setActivity('!' + config.app + ' help (' + client.guilds.cache.size + ' servers)');
    console.log("Ready");
});

client.on("guildCreate", guild => {
    client.user.setActivity('!' + config.app + ' help (' + client.guilds.cache.size + ' servers)');
});

//removed from a server
client.on("guildDelete", guild => {
    client.user.setActivity('!' + config.app + ' help (' + client.guilds.cache.size + ' servers)');
});

client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if (message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix, 
    // which is set in the configuration file.
    if (message.content.indexOf(config.prefix) !== 0) {
        return;
    };

    // Here we separate our "command" name, and our "arguments" for the command. 
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const amtbot = args.shift().toLowerCase();

    if (amtbot !== config.app) {
        return;
    }
    totalMessages++;
    var command = "help";
    if (args.length !== 0) {
        command = args.shift().toLowerCase();
    }

    if (command === "add" || command === "addme") {
        // expand shortcut
        args.unshift("addme");
        command = "attendance";
    }

    switch (command) {
        case "myork":
            if (args.length === 0) {
                dbo.collection("ork_ids").findOne({ discord_id: message.author.id }, function (err, result) {
                    if (err) throw err;
                    if (result === null) {
                        message.reply("Associate an ORK Id using **!ab myork id *ork_username***. See **!ab myork help** for examples.").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 10000 }) };
                        });
                        return;
                    }
                    message.reply("Your associated ORK Id is *" + result.ork_id + "*. See other options with **!ab myork help**").then(function (reply) {
                        if (!reply.deleted) { reply.delete({ timeout: 6000 }); }
                    });
                });
                return;
            }
            if (args.length >= 2 && args[0] === 'id') {
                var playerSearch = args.slice(1).join(" ");
                jsork.searchservice.searchPlayer(playerSearch).then(function (players) {
                    if (!players.length) {
                        message.reply("no matches for _" + playerSearch + "_").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    if (players.length > 10) {
                        var tooManyResults;
                        if (args[args.length-1].indexOf("-") !== -1) {
                            tooManyResults = "Too many results. Player names with '-' can be very difficult to search for. Consider having your Chancellor rename your id. Try limiting your search to your kingdom and/or park. Look at **!ab myork help** for player filter suggestions";
                        } else {
                            tooManyResults = "Too many results. Try limiting your search to your kingdom and/or park. Look at **!ab myork help** for player filter suggestions";
                        }
                        message.reply(tooManyResults).then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 30000 }); }
                        });
                        return;
                    }
                    var associatePlayer = function (aPlayer) {
                        var myobj = { $set: { discord_id: message.author.id, ork_id: aPlayer.UserName, ork_mundane_id: aPlayer.MundaneId } };
                        dbo.collection("ork_ids").updateOne({ discord_id: message.author.id }, myobj, { upsert: true }, function (err, res) {
                            if (err) throw err;
                            message.reply("your discord account is now associated with the ORK id *" + aPlayer.UserName + "*").then(function (reply) {
                                if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                            });
                        });
                    };

                    if (players.length > 1) {
                        var chooseFrom = "\nChoose from multiple results, 0 to exit: ";
                        players.forEach(function (aResult, index) {
                            chooseFrom += "\n" + (index + 1) + ") *" + aResult.UserName + "* (" + aResult.Persona + ")" + " - " + aResult.KingdomName + " - " + aResult.ParkName;
                        });
                        message.reply(chooseFrom).then(function (replyMessage) {
                            const collector = new MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 15000 });
                            collector.on('collect', message => {
                                var userChoice = 0;
                                if (/^\d+$/.test(message.content)) {
                                    userChoice = Number(message.content);
                                }
                                if (userChoice > players.length || userChoice === 0) {
                                    if (!replyMessage.deleted) { replyMessage.delete(); }
                                    return;
                                }
                                if (!replyMessage.deleted) {
                                    replyMessage.delete();
                                }
                                associatePlayer(players[userChoice - 1]);
                            });
                            collector.on('end', endMessage => {
                                if (!replyMessage.deleted) {
                                    replyMessage.delete();
                                }
                            });
                        });
                        return;
                    }
                    associatePlayer(players[0]);
                });
                return;
            }
            if (args.length === 1 && args[0] === 'remove_id') {
                dbo.collection("ork_ids").deleteOne({ discord_id: message.author.id }, function (err, res) {
                    if (err) throw err;
                    message.reply("Your discord account is no longer associated with an ORK id").then(function (reply) {
                        if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                    });
                });
                return;
            }
            var helpEmbed = {
                color: 3447003,
                title: "!ab myork",
                description: "Associate your discord account with an ORK id. You only have to do this on one server, it will apply across them all.",
                fields: []
            };
            var idHelp = [];
            idHelp.push("Associate your discord account with an ORK id. You can use filters to limit to Kingdom or Park");
            idHelp.push("*Examples:*");
            idHelp.push("**!ab myork id lord_kismet_shenchu** (An exact match)");
            idHelp.push("**!ab myork id nb: varen** (Only look in Nine Blades)");
            idHelp.push("**!ab myork id kop:et fluffy** (Only look in Kingdom of Polaris, Ethereal Tiles)");
            idHelp.push("If your username has a hyphen, try only using the last part of the name");
            helpEmbed.fields.push({ name: "!ab myork", value: "Displays your associated ORK id", inline: false });
            helpEmbed.fields.push({ name: "!ab myork id *ork_username*", value: idHelp, inline: false });
            helpEmbed.fields.push({ name: "!ab myork remove_id", value: "Remove any association between your discord account and the ORK", inline: false });
            helpEmbed.fields.push({ name: "!ab myork help", value: "Displays this help (removed after 30 seconds_).", inline: false });
            message.reply({ embed: helpEmbed }).then(function (reply) {
                if (!reply.deleted) { reply.delete({ timeout: 30000 }); }
            });
            break;
        case "song":
            var serverID = message.guild.id;
            var helpMessage = function() {
                dbo.collection("bardic").findOne({ bardic_track: serverID }, function (err, result) {
                    if (err) throw err;
                    var helpEmbed = {
                        color: 3447003,
                        title: "!ab song",
                        description: "Setup a bardic song list. Players can add or request songs with the **!ab song add** or **!ab song request** options",
                        fields: []
                    };
                    helpEmbed.fields.push({ name: "!ab song add *song name*", value: "Add a song you're going to perform to the Bardic list. You need to provide the name of the song you're performing", inline: false });
                    helpEmbed.fields.push({ name: "!ab song request *song name*", value: "Add a song you'd like someone to perform in the Bardic. You need to provide the name of the song", inline: false });
                    helpEmbed.fields.push({ name: "!ab song list", value: "Show the current Bardic song list", inline: false });
                    helpEmbed.fields.push({ name: "!ab song done|remove *song number*", value: "Remove a song from the list", inline: false });
                    helpEmbed.fields.push({ name: "!ab song clear", value: "Clear *ALL* the songs from the Bardic list", inline: false });
                    helpEmbed.fields.push({ name: "!ab song help", value: "Show this help", inline: false });
                    if (result !== null && result.songs.length > 0) {
                        helpEmbed.fields.push({ name: "Active Bardic!", value: "There is an ACTIVE bardic session currently, use *!ab song list* to see the list", inline: false });
                    }
                    message.reply({ embed: helpEmbed });
                });
            }
            if (args.length === 0) {
                helpMessage();
                break;
            }
            if (args.length === 1 && args[0] === "list") {
                dbo.collection("bardic").findOne({ bardic_track: serverID }, function (err, result) {
                    if (err) throw err;
                    if (result === null || result.songs.length === 0) {
                        message.reply("There is no bardic in progress, try adding some songs").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var song_numbers = [];
                    var song_titles = [];
                    var song_users = [];
                    result.songs.forEach(function(aSong) {
                        song_numbers.push(aSong.number);
                        song_titles.push(aSong.title);
                        if (aSong.requested) {
                            song_users.push("Requested: " + aSong.username);
                        } else {
                            song_users.push("Performer: " + aSong.username);
                        }
                    });

                    var statusEmbed = {
                        color: 3447003,
                        title: "Bardic Song List",
                        fields: []
                    };
                    statusEmbed.fields.push({ name: "Song Number", value: song_numbers, inline: true });
                    statusEmbed.fields.push({ name: "Title", value: song_titles, inline: true });
                    statusEmbed.fields.push({ name: "Request or Performer", value: song_users, inline: true });
                    message.reply({ embed: statusEmbed });
                });
                break;
            }
            if (args.length >= 1 && args[0] === "add") {
                if (args.length < 2) {
                    message.reply("Please provide a song title to add").then(function (reply) {
                        if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                    });
                    return;
                }
                dbo.collection("bardic").findOne({ bardic_track: serverID }, function (err, result) {
                    var respondWithMessage = function(theResults, songNumber) {
                        var songRecord = {
                            username: message.member.displayName,
                            number: songNumber,
                            requested: false,
                            title: args.slice(1).join(" ")
                        };
                        theResults.songs.push(songRecord);
                        var myobj = { $set: { songs: theResults.songs } };
                        dbo.collection("bardic").updateOne({ bardic_track: serverID }, myobj, function (err, res) {
                            message.reply("Added song number " + songNumber + " to the Bardic list").then(function (reply) {
                                if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                            });
                        });
                    }
                    if (result === null) {
                        var newRecord = {
                            bardic_track: serverID,
                            songs: []
                        };
                        dbo.collection("bardic").insertOne(newRecord, function (err, insertResult) {
                            respondWithMessage(newRecord, 1);
                        });
                    } else {
                        var nextSong = result.songs.length === 0 ? 1 : ((result.songs[(result.songs.length - 1)].number + 1));
                        respondWithMessage(result, nextSong);
                    }
                });
                break;
            }
            if (args.length >= 1 && args[0] === "request") {
                if (args.length < 2) {
                    message.reply("Please provide a song title in your request").then(function (reply) {
                        if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                    });
                    return;
                }
                dbo.collection("bardic").findOne({ bardic_track: serverID }, function (err, result) {
                    // var search_filter = { discord_id: message.author.id };
                    var respondWithMessage = function(theResults, songNumber) {
                        var songRecord = {
                            username: message.member.displayName,
                            number: songNumber,
                            requested: true,
                            title: args.slice(1).join(" ")
                        };
                        theResults.songs.push(songRecord);
                        var myobj = { $set: { songs: theResults.songs } };
                        dbo.collection("bardic").updateOne({ bardic_track: serverID }, myobj, function (err, res) {
                            message.reply("Added song number " + songNumber + " to the Bardic list").then(function (reply) {
                                if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                            });
                        });
                    }
                    if (result === null) {
                        var newRecord = {
                            bardic_track: serverID,
                            songs: []
                        };
                        dbo.collection("bardic").insertOne(newRecord, function (err, insertResult) {
                            respondWithMessage(newRecord, 1);
                        });
                    } else {
                        var nextSong = result.songs.length === 0 ? 1 : ((result.songs[(result.songs.length - 1)].number + 1));
                        respondWithMessage(result, nextSong);
                    }
                });
                break;
            }
            if ((args.length >= 1 && args[0] === "done") || (args.length >= 1 && args[0] === "remove")) {
                dbo.collection("bardic").findOne({ bardic_track: serverID }, function (err, result) {
                    if (result === null || result.songs.length === 0) {
                        message.reply("There's no Bardic in progress").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    if (args.length < 2 || isNaN(parseInt(args[1]))) {
                        message.reply("Please provide a song number to remove in your request").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var entry = result.songs.find(function (aSong) {
                        return aSong.number === parseInt(args[1]);
                    });
                    if (!entry) {
                        message.reply("There's no song number " + parseInt(args[1])).then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    result.songs = result.songs.filter(function (aSong) {
                        return aSong.number !== parseInt(args[1]);
                    });
                    result.songs.forEach(function(aSong, index) {
                        aSong.number = index + 1;
                    });
                    var myobj = { $set: { songs: result.songs } };
                    dbo.collection("bardic").updateOne({ bardic_track: serverID }, myobj, function (err, res) {
                        message.reply("The song has been removed").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                    });
                });
                break;
            }
            if ((args.length >= 1 && args[0] === "clear")) {
                dbo.collection("bardic").findOne({ bardic_track: serverID }, function (err, result) {
                    if (result === null || result.songs.length === 0) {
                        message.reply("There's no Bardic in progress").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var prompt = "\nReally delete all songs? Y to confirm";
                    message.reply(prompt).then(function (replyMessage) {
                        const collector = new MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 15000 });
                        collector.on('collect', message => {
                            if (!replyMessage.deleted) { replyMessage.delete(); }
                            if (message.content.toLowerCase() === 'y') {
                                result.songs = [];
                                var myobj = { $set: { songs: result.songs } };
                                dbo.collection("bardic").updateOne({ bardic_track: serverID }, myobj, function (err, res) {
                                    message.reply("All the songs have been removed").then(function (reply) {
                                        if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                                    });
                                });
                            } else {
                                message.reply("Bardic list not cleared").then(function (reply) {
                                    if (!reply.deleted) { reply.delete({ timeout: 2000 }); }
                                });
                            }
                            collector.stop();
                        });
                    });
                });
                break;
            }
            helpMessage();
            break;
        case "attendance":
            var serverID = message.guild.id;
            if (args.length === 0) {
                dbo.collection("attendance").findOne({ event_track: serverID }, function (err, result) {
                    if (err) throw err;
                    var helpEmbed = {
                        color: 3447003,
                        title: "!ab attendance",
                        description: "Track attendance for a discord event. Once started players add themselves with the **!ab attendance addme** option",
                        fields: []
                    };
                    helpEmbed.fields.push({ name: "!ab attendance start *optional_description*", value: "Starts tracking attendance until stop is issued. You can pass an optional description.", inline: false });
                    helpEmbed.fields.push({ name: "!ab attendance addme *optional_class*", value: "Add yourself to the attendee list. You can provide an optional parameter of the class you want. There's a NEW shortcut for this using " + config.prefix + config.app + " addme *optional_class*", inline: false });
                    helpEmbed.fields.push({ name: "!ab attendance removeme", value: "Remove yourself from current attendance", inline: false });
                    helpEmbed.fields.push({ name: "!ab attendance description *new description*", value: "Change the description of the attendance", inline: false });
                    helpEmbed.fields.push({ name: "!ab attendance status", value: "Shows the current attendance status", inline: false });
                    helpEmbed.fields.push({ name: "!ab attendance stop", value: "Stops tracking attendance and shows the participant list", inline: false });
                    if (result !== null) {
                        helpEmbed.fields.push({ name: "CURRENTLY TRACKING", value: "There is an ACTIVE tracking session currently!", inline: false });
                    }
                    message.reply({ embed: helpEmbed });
                });
                break;
            }
            if (args.length >= 1 && args[0] === "description") {
                dbo.collection("attendance").findOne({ event_track: serverID }, function (err, result) {
                    if (err) throw err;
                    if (result === null) {
                        message.reply("There's no ACTIVE tracking session to change the description for").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    if (args.length < 2) {
                        message.reply("Please provide a new description in the request").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var attendanceDescription = "";
                    if (args.length >= 2) {
                        attendanceDescription = args.slice(1).join(" ");
                    }
                    result.description = attendanceDescription;
                    var myobj = { $set: { description: result.description } };
                    dbo.collection("attendance").updateOne({ event_track: serverID }, myobj, function (err, res) {
                        message.reply("The event description has been updated").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                    });    
                });
            }
            if (args.length >= 1 && args[0] === "start") {
                dbo.collection("attendance").findOne({ event_track: serverID }, function (err, result) {
                    if (err) throw err;
                    if (result !== null) {
                        message.reply("There's an ACTIVE tracking session started " + timeConversion(Date.now() - result.start_time) + " ago").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var participants = [];
                    // var userRecord = {
                    //     username: message.author.username,
                    //     id: message.author.id
                    // };
                    // participants.push(userRecord);

                    var attendanceDescription = "";
                    if (args.length >= 2) {
                        attendanceDescription = args.slice(1).join(" ");
                    }
                    var newRecord = {
                        event_track: serverID,
                        start_time: Date.now(),
                        participants: participants,
                        description: attendanceDescription,
                        date_String: message.createdAt.toDateString()
                    };
                    dbo.collection("attendance").insertOne(newRecord, function (err, result) {
                        message.reply("Starting to track attendance. Everyone, including you, can now add themselves with\n**!ab attendance addme *optional_class* **");
                    });
                    totalAttendances++;
                });
                break;
            }
            if (args.length === 1 && args[0] === "status") {
                dbo.collection("attendance").findOne({ event_track: serverID }, function (err, result) {
                    if (err) throw err;
                    if (result === null) {
                        message.reply("There is no active attendance session in progress").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var ids_to_find = result.participants.map(function (aUser) { return aUser.id; });
                    var search_filter = { discord_id: { $in: ids_to_find } };
                    dbo.collection("ork_ids").find(search_filter).toArray(function (err, orkResults) {
                        var discord_players = [];
                        var ork_players = [];
                        var chosen_classes = [];
                        result.participants.forEach(function (aParticipant) {
                            var orkInfo = orkResults.find(function (orkUser) {
                                return orkUser.discord_id === aParticipant.id;
                            });
                            discord_players.push(aParticipant.username);
                            if (orkInfo) {
                                if (!aParticipant.kingdom) {
                                    ork_players.push(orkInfo.ork_id);
                                } else {
                                    ork_players.push(aParticipant.kingdom + ":" + aParticipant.park + " " +orkInfo.ork_id);
                                }
                            } else {
                                ork_players.push(" -- ");
                            }
                            chosen_classes.push(aParticipant.chosen_class || " -- ");
                        });
                        var statusEmbed = {
                            color: 3447003,
                            title: "Current attendance",
                            fields: []
                        };
                        statusEmbed.fields.push({ name: "Tracking time", value: timeConversion(Date.now() - result.start_time), inline: false });
                        if (result.participants.length > 0) {
                            statusEmbed.fields.push({ name: "Discord name", value: discord_players, inline: true });
                            statusEmbed.fields.push({ name: "ORK name", value: ork_players, inline: true });
                            statusEmbed.fields.push({ name: "Chosen Class", value: chosen_classes, inline: true });
                            if (result.description) {
                                statusEmbed.description = result.description;
                            }
                        } else {
                            statusEmbed.description = "There are no current participants";
                        }
                        message.reply({ embed: statusEmbed });
                    });
                });
                break;
            }
            if ((args.length >= 1 && args[0] === "removeme") || (args.length >= 1 && args[0] === "remove")) {
                dbo.collection("attendance").findOne({ event_track: serverID }, function (err, result) {
                    if (err) throw err;
                    if (result === null) {
                        message.reply("There is no active attendance session in progress").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var alreadyTracked = result.participants.find(function (aParticipant) {
                        return aParticipant.id === message.author.id;
                    });
                    if (!alreadyTracked) {
                        message.reply("You are not marked as attending the current attendance session").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    };
                    result.participants = result.participants.filter(function (aParticipant) {
                        return aParticipant.id !== message.author.id;
                    });
                    var myobj = { $set: { participants: result.participants } };
                    dbo.collection("attendance").updateOne({ event_track: serverID }, myobj, function (err, res) {
                        message.reply("You've been removed from the current attendance ").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                    });
                });
            }
            if ((args.length >= 1 && args[0] === "addme") || (args.length >= 1 && args[0] === "add")) {
                dbo.collection("attendance").findOne({ event_track: serverID }, function (err, result) {
                    if (err) throw err;
                    if (result === null) {
                        message.reply("There is no active attendance session in progress").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    var alreadyTracked = result.participants.find(function (aParticipant) {
                        return aParticipant.id === message.author.id;
                    });
                    var wrongColor = false;
                    if (args.length > 1 && args[1].toLowerCase() === "colour") {
                        args[1] = "color";
                        wrongColor = true;
                    }
                    var search_filter = { discord_id: message.author.id };
                    var additionalPlayerInfo = {};

                    var respondWithMessage = function() {
                        // Was the class provided as an argument?
                        if (args.length > 1) {
                            var chosenClass = allClasses.find(function (item) { return item.toLowerCase() === args[1].toLowerCase() });
                            if (chosenClass) {
                                if (alreadyTracked) {
                                    alreadyTracked.chosen_class = chosenClass;
                                } else {
                                    var userRecord = {
                                        username: message.author.username,
                                        id: message.author.id,
                                        chosen_class: chosenClass,
                                        kingdom: additionalPlayerInfo.kingdom,
                                        park: additionalPlayerInfo.park,
                                        fullKingdom: additionalPlayerInfo.fullKingdom,
                                        fullPark: additionalPlayerInfo.fullPark
                                    };
                                    result.participants.push(userRecord);
                                }
                                var myobj = { $set: { participants: result.participants } };
                                dbo.collection("attendance").updateOne({ event_track: serverID }, myobj, function (err, res) {
                                    if (alreadyTracked) {
                                        message.reply("You've changed your credit to " + chosenClass + (wrongColor ? ", eh" : ""));
                                    } else {
                                        message.reply("You've been added to the attendee list as " + chosenClass + (wrongColor ? ", eh" : ""));
                                    }
                                });
                                return;
                            }
                        }
                        var chooseFrom = "\nChoose your class, 0 to cancel: \n";
                        if (alreadyTracked) {
                            chooseFrom = "\nYou are already attending as " + alreadyTracked.chosen_class + ". You can choose a new class or 0 to cancel:\n";
                        }
                        allClasses.forEach(function (aClass, index) {
                            chooseFrom += (index + 1) + ") *" + aClass + "*";
                            if (false && (index + 1) % 3 === 0 && index < allClasses.length) {
                                chooseFrom += "\n";
                            } else {
                                chooseFrom += "  ";
                            }
                        });
                        message.reply(chooseFrom).then(function (replyMessage) {
                            const collector = new MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 15000 });
                            collector.on('collect', message => {
                                var userChoice = 0;
                                if (/^\d+$/.test(message.content)) {
                                    userChoice = Number(message.content);
                                }
                                if (userChoice > allClasses.length || userChoice === 0) {
                                    if (!replyMessage.deleted) { replyMessage.delete(); }
                                    return;
                                }
                                if (!replyMessage.deleted) {
                                    replyMessage.delete();
                                }
                                var chosenClass = allClasses[userChoice - 1];
                                if (alreadyTracked) {
                                    alreadyTracked.chosen_class = chosenClass
                                } else {
                                    var userRecord = {
                                        username: message.author.username,
                                        id: message.author.id,
                                        chosen_class: chosenClass,
                                        kingdom: additionalPlayerInfo.kingdom,
                                        park: additionalPlayerInfo.park,
                                        fullKingdom: additionalPlayerInfo.fullKingdom,
                                        fullPark: additionalPlayerInfo.fullPark
                                    };
                                    result.participants.push(userRecord);
                                }
                                var myobj = { $set: { participants: result.participants } };
                                dbo.collection("attendance").updateOne({ event_track: serverID }, myobj, function (err, res) {
                                    if (alreadyTracked) {
                                        message.reply("You've changed your credit to " + chosenClass);
                                    } else {
                                        message.reply("You've been added to the attendee list as " + chosenClass);
                                    }
                                });
                            });
                            collector.on('end', endMessage => {
                                if (!replyMessage.deleted) {
                                    replyMessage.delete();
                                }
                            });
                        });
                    };

                    dbo.collection("ork_ids").find(search_filter).toArray(function (err, orkResults) {
                        if (orkResults.length > 0) {
                            jsork.player.getInfo(orkResults[0].ork_mundane_id).then(function(playerInfo) {
                                jsork.kingdom.getInfo(playerInfo.KingdomId).then(function(results) {
                                    additionalPlayerInfo.kingdom = results.Abbreviation;
                                    additionalPlayerInfo.fullKingdom = results.KingdomName;
                                    jsork.park.getInfo(playerInfo.ParkId).then(function(results) {
                                        additionalPlayerInfo.park = results.Abbreviation;
                                        additionalPlayerInfo.fullPark = results.ParkName;
                                        respondWithMessage();
                                    });
                                });
                            });
                        } else {
                            respondWithMessage();
                        }
                    });
                });
                break;
            }
            if (args.length === 1 && args[0] === "stop") {
                dbo.collection("attendance").findOne({ event_track: serverID }, function (err, result) {
                    if (err) throw err;
                    if (result === null) {
                        message.reply("There is no active attendance session in progress").then(function (reply) {
                            if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                        });
                        return;
                    }
                    if (result.participants.length === 0) {
                        message.reply("There were no participants");
                        dbo.collection("attendance").deleteOne({ event_track: serverID }, function (err, result) {
                        });
                        return;
                    }
                    if (result.participants.length > largestAttendance) {
                        largestAttendance = result.participants.length;
                        largestAttendanceServer = message.guild.name;
                        largestAttendanceEventname = result.description || "Event had no description";
                    }
                    var ids_to_find = result.participants.map(function (aUser) { return aUser.id; });
                    var search_filter = { discord_id: { $in: ids_to_find } };
                    var textResults = "";
                    textResults += "Discord name\tORK name\tKingdom\tPark\tChosen class\t";
                    textResults += result.description || "No event description";
                    textResults += "\t";
                    textResults += "Tracking time " + timeConversion(Date.now() - result.start_time);
                    textResults += "\t";
                    textResults += "Tracking date " + result.date_String;
                    textResults += "\r\n";

                    dbo.collection("ork_ids").find(search_filter).toArray(function (err, orkResults) {
                        var discord_players = [];
                        var ork_players = [];
                        var chosen_classes = [];
                        result.participants.forEach(function (aParticipant) {
                            var orkInfo = orkResults.find(function (orkUser) {
                                return orkUser.discord_id === aParticipant.id;
                            });
                            discord_players.push(aParticipant.username);
                            textResults += aParticipant.username + "\t";
                            if (orkInfo) {
                                if (!aParticipant.kingdom) {
                                    ork_players.push(orkInfo.ork_id);
                                    textResults += orkInfo.ork_id + "\t\t\t";
                                } else {
                                    ork_players.push(aParticipant.kingdom + ":" + aParticipant.park + " " + orkInfo.ork_id);
                                    
                                    textResults += aParticipant.kingdom + ":" + aParticipant.park + " " +orkInfo.ork_id + "\t";
                                    textResults += aParticipant.fullKingdom + "\t";
                                    textResults += aParticipant.fullPark + "\t";
                                }
                            } else {
                                ork_players.push(" -- ");
                                textResults += " -- \t -- \t -- \t";
                            }
                            chosen_classes.push(aParticipant.chosen_class || " -- ");
                            textResults += aParticipant.chosen_class || " -- ";
                            textResults += "\t\t\t\r\n";
                        });
                        var statusEmbed = {
                            color: 3447003,
                            title: "Event attendance",
                            fields: []
                        };
                        if (result.description) {
                            statusEmbed.description = result.description;
                        }
                        statusEmbed.fields.push({ name: "Tracking time", value: timeConversion(Date.now() - result.start_time), inline: false });
                        statusEmbed.fields.push({ name: "Tracking date", value: result.date_String, inline: false });
                        statusEmbed.fields.push({ name: "Discord name", value: discord_players, inline: true });
                        statusEmbed.fields.push({ name: "ORK name", value: ork_players, inline: true });
                        statusEmbed.fields.push({ name: "Chosen Class", value: chosen_classes, inline: true });
                        message.reply({ embed: statusEmbed }).then(function(reply) {
                            dbo.collection("attendance").deleteOne({ event_track: serverID }, function (err, result) {
                            });
                        }).catch(function(err) {
                            // don't delete the attendance if something went wrong posting the results
                        });
                        const attachment = new MessageAttachment(Buffer.from(textResults, 'utf-8'), 'attendance_'+result.date_String+'.csv');
                        message.reply(`the attendance is in this attachment`, attachment);
                    });
                });
                break;
            }
            break;
        case "roll":
            var dieNumber = Number(args[0]);
            if (args.length === 1 && /^\d+$/.test(args[0]) && dieNumber > 0) {
                var randomInteger = Math.floor(Math.random() * Math.floor(dieNumber)) + 1;
                message.reply("rolled " + dieNumber + " and got " + randomInteger);
            } else {
                message.reply("Provide a number to randomize. Eg. *!ab roll 20*").then(function (reply) {
                    if (!reply.deleted) { reply.delete({ timeout: 6000 }); }
                });
                return;
            }
            break;
        case "spell":
            if (args.length === 0) {
                var helpEmbed = {
                    color: 3447003,
                    title: "!ab spell *search_term*",
                    description: "Look up an Amtgard spell by name. The lookup is by a concatenated short name.",
                    fields: []
                };
                helpEmbed.fields.push({ name: "!ab spell heatweapon", value: "An exact match for the spell", inline: false });
                helpEmbed.fields.push({ name: "!ab spell ball", value: "Will show multiple results to pick from", inline: false });
                helpEmbed.fields.push({ name: "!ab spell", value: "Displays this help. _This help is removed after 30 seconds_", inline: false });
                message.reply({ embed: helpEmbed }).then(function (reply) {
                    if (!reply.deleted) { reply.delete({ timeout: 30000 }); }
                });
                return;
            }
            var aSpell = args[0];
            fuzzyResults = FuzzySort.go(aSpell, Object.keys(allSpells));
            if (!fuzzyResults.length) {
                message.reply("no matches for _" + aSpell + "_").then(function (reply) {
                    if (!reply.deleted) { reply.delete({ timeout: 6000 }); }
                });
                return;
            }
            if (fuzzyResults.length > 1 && fuzzyResults[0].score !== 0) {
                var chooseFrom = "Multiple results: ";
                fuzzyResults.forEach(function (aResult, index) {
                    chooseFrom += "*" + aResult.target + "*";
                    if (index < fuzzyResults.length - 1) {
                        chooseFrom += ", ";
                    }
                });
                message.reply(chooseFrom).then(function (reply) {
                    if (!reply.deleted) { reply.delete({ timeout: 12000 }); }
                });
                return;
            }

            if (true) {
                var aSpell = allSpells[fuzzyResults[0]["target"]];
                var spellEmbed = {
                    color: 3447003,
                    title: aSpell.name,
                    fields: []
                };
                var classes = "";
                Object.keys(aSpell.classes).forEach(function (aClass, index) {
                    classes += aClass;
                    classes += " (" + aSpell.classes[aClass] + ") ";
                })
                spellEmbed.fields.push({ name: "Classes", value: classes, inline: false });
                if (aSpell.t) {
                    spellEmbed.fields.push({ name: "Type", value: aSpell.t, inline: true });
                }
                if (aSpell.s) {
                    spellEmbed.fields.push({ name: "School", value: aSpell.s, inline: true });
                }
                if (aSpell.r) {
                    spellEmbed.fields.push({ name: "Range", value: aSpell.r, inline: true });
                }
                if (aSpell.i) {
                    spellEmbed.fields.push({ name: "Incant", value: strip_html_tags(aSpell.i), inline: false });
                }
                if (aSpell.m) {
                    spellEmbed.fields.push({ name: "Materials", value: strip_html_tags(aSpell.m), inline: false });
                }
                if (aSpell.e) {
                    spellEmbed.fields.push({ name: "Effect", value: strip_html_tags(aSpell.e), inline: false });
                }
                if (aSpell.l) {
                    spellEmbed.fields.push({ name: "Limitations", value: strip_html_tags(aSpell.l), inline: false });
                }
                if (aSpell.n) {
                    spellEmbed.fields.push({ name: "Notes", value: strip_html_tags(aSpell.n), inline: false });
                }
                message.channel.send({ embed: spellEmbed });
            }
            break;
        case "player":
            if (args.length === 0) {
                var helpEmbed = {
                    color: 3447003,
                    title: "!ab player *ork_username*",
                    description: "Provide an ORK username to display the stats for. You can use filters to limit to a Kingdom or Park search.",
                    fields: []
                };
                var idHelp = [];
                idHelp.push("**!ab player lord_kismet_shenchu** (An exact match)");
                idHelp.push("**!ab player nb: varen** (Only look in Nine Blades)");
                idHelp.push("**!ab player kop:et fluffy** (Only look in Kingdom of Polaris, Ethereal Tiles)");
                idHelp.push("If your username has a hyphen, try only using the last part of the name");
                idHelp.push("_this message will be removed in 30 seconds_");
                helpEmbed.fields.push({ name: "*Examples:*", value: idHelp, inline: false });
                message.reply({ embed: helpEmbed }).then(function (reply) {
                    if (!reply.deleted) { reply.delete({ timeout: 30000 }); }
                });
                return;
            }
            var playerSearch = args.join(' ');

            jsork.searchservice.searchUsername(playerSearch).then(function (players) {
                if (!players.length) {
                    message.reply("no matches for _" + playerSearch + "_").then(function (reply) {
                        if (!reply.deleted) { reply.delete({ timeout: 4000 }); }
                    });
                    return;
                }
                if (players.length > 10) {
                    var tooManyResults;
                    if (args[args.length-1].indexOf("-") !== -1) {
                        tooManyResults = "Too many results. Player names with '-' can be very difficult to search for. Consider having your Chancellor rename your id. Try limiting your search to your kingdom and/or park. Look at **!ab player** for player filter suggestions";
                    } else {
                        tooManyResults = "Too many results. Try limiting your search to your kingdom and/or park. Look at **!ab player** for player filter suggestions";
                    }
                    message.reply(tooManyResults).then(function (reply) {
                        if (!reply.deleted) { reply.delete({ timeout: 15000 }); }
                    });
                    return;
                }
                var showPlayer = function (aPlayer) {
                    jsork.player.getClasses(aPlayer.MundaneId).then(function (classes) {
                        var playerEmbed = {
                            color: 3447003,
                            title: aPlayer.UserName + ' (' + aPlayer.Persona + ')',
                            url: 'https://ork.amtgard.com/orkui/index.php?Route=Player/index/' + aPlayer.MundaneId,
                            fields: []
                        };
                        playerEmbed.fields.push({ name: "Park", value: aPlayer.ParkName, inline: true });
                        playerEmbed.fields.push({ name: "Kingdom", value: aPlayer.KingdomName, inline: true });
                        var classInfo = classes.map(function (aClass) {
                            return aClass.class + " - Level " + aClass.level + " - Credits " + aClass.credits + "";
                        });
                        playerEmbed.fields.push(
                            { name: "Classes", value: classInfo, inline: false }
                        );
                        message.channel.send({ embed: playerEmbed });
                    });
                };

                if (players.length > 1) {
                    var chooseFrom = "\nChoose from multiple results, 0 to exit: ";
                    players.forEach(function (aResult, index) {
                        chooseFrom += "\n" + (index + 1) + ") *" + aResult.UserName + "* (" + aResult.Persona + ")" + " - " + aResult.KingdomName + " - " + aResult.ParkName;
                    });
                    message.reply(chooseFrom).then(function (replyMessage) {
                        const collector = new MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 15000 });
                        collector.on('collect', message => {
                            var userChoice = 0;
                            if (/^\d+$/.test(message.content)) {
                                userChoice = Number(message.content);
                            }
                            if (userChoice > players.length || userChoice === 0) {
                                if (!replyMessage.deleted) { replyMessage.delete(); }
                                return;
                            }
                            if (!replyMessage.deleted) {
                                replyMessage.delete();
                            }
                            showPlayer(players[userChoice - 1]);
                        });
                        collector.on('end', endMessage => {
                            if (!replyMessage.deleted) {
                                replyMessage.delete();
                            }
                        });
                    });
                    return;
                }
                showPlayer(players[0]);
            });
            break;
        case "servers":
            dbo.collection("ork_ids").count().then(function(countORKid) {
                dbo.collection("attendance").count().then(function(liveAttendances) {
                    var totalServers = 0;
                    client.guilds.cache.forEach(function (aGuild) {
                        totalServers++;
                        console.log(aGuild.name + " : " + (aGuild.region || " "));
                    })
                    var serversEmbed = {
                        color: 3447003,
                        description: "AmtBot is active on " + totalServers + " servers",
                        fields: []
                    };
                    serversEmbed.fields.push({ name: "Last restart", value: timeConversion(Date.now() - launchTime), inline: false });
                    serversEmbed.fields.push({ name: "Messages Processed", value: totalMessages, inline: false });
                    serversEmbed.fields.push({ name: "ORK IDs", value: countORKid, inline: false });
                    serversEmbed.fields.push({ name: "Number of Attendance tracking sessions", value: totalAttendances.toString(), inline: false });
                    serversEmbed.fields.push({ name: "Largest Attendance", value: largestAttendance.toString(), inline: true });
                    serversEmbed.fields.push({ name: "Server", value: largestAttendanceServer.toString(), inline: true });
                    serversEmbed.fields.push({ name: "Event", value: largestAttendanceEventname.toString(), inline: true });
                    serversEmbed.fields.push({ name: "Currently Live Attendance Sessions", value: liveAttendances.toString(), inline: false });
                    message.channel.send({ embed: serversEmbed });
                });
            });
            break;
        case "help":
        default:
            var helpEmbed = {
                color: 3447003,
                title: "AmtBot - Click here for the Facebook Page",
                description: "Amtgard bot for discord. Various commands to help with immersion. See the growing list of commands below.",
                fields: []
            };
            helpEmbed.fields.push({ name: "!ab myork", value: "Associate your discord account with your ORK id", inline: false });
            helpEmbed.fields.push({ name: "!ab player", value: "Look up an Amtgard player in the ORK", inline: false });
            helpEmbed.fields.push({ name: "!ab spell", value: "Look up an Amtgard spell and display the information about it", inline: false });
            helpEmbed.fields.push({ name: "!ab attendance", value: "Start tracking attendance for an online event", inline: false });
            helpEmbed.fields.push({ name: "!ab addme", value: "Shortcut to _" + config.prefix + config.app + " attendance addme_", inline: false });
            helpEmbed.fields.push({ name: "!ab roll", value: "Generate a random integer between 1 and the provided integer parameter", inline: false });
            // helpEmbed.fields.push({ name: "!ab song", value: "Bardic playlist of songs and requests for songs", inline: false });
            helpEmbed.fields.push({ name: "!ab help", value: "Show this help information", inline: false });
            helpEmbed.footer = { text: "Written by Kismet (Easygard, mORK, jsork, AmtQuest, AmtBot)" };
            helpEmbed.url = 'https://www.facebook.com/discordamtbot/';
            message.reply({ embed: helpEmbed });
            break;
    }

});

function strip_html_tags(str) {
    if ((str === undefined || str === null) || (str === ''))
        return false;
    else
        str = str.toString();
    return str.replace(/<[^>]*>/g, '');
}

function timeConversion(milliseconds) {
    //Get hours from milliseconds
    var hours = milliseconds / (1000 * 60 * 60);
    var absoluteHours = Math.floor(hours);
    var h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours;

    //Get remainder from hours and convert to minutes
    var minutes = (hours - absoluteHours) * 60;
    var absoluteMinutes = Math.floor(minutes);
    var m = absoluteMinutes > 9 ? absoluteMinutes : '0' + absoluteMinutes;

    //Get remainder from minutes and convert to seconds
    var seconds = (minutes - absoluteMinutes) * 60;
    var absoluteSeconds = Math.floor(seconds);
    var s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds;

    return h + ':' + m + ':' + s;
}

client.login(config.token);