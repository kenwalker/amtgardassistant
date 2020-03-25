const Discord = require("discord.js");
const FuzzySort = require("./fuzzysort.js");
const jsork = require("./jsork.js");
const https = require('https');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("amtbot");
    dbo.createCollection("ork_ids", function (err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});

const client = new Discord.Client();

const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

var allSpells = require('./spells.json');

client.on("ready", () => {
    client.user.setActivity(`!ab help`);
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

    if (amtbot !== 'ab') {
        return;
    }
    var command = "help";
    if (args.length !== 0) {
        command = args.shift().toLowerCase();
    }

    switch (command) {
        case "myork":
            if (args.length === 0) {
                MongoClient.connect(url, function (err, db) {
                    if (err) throw err;
                    var dbo = db.db("amtbot");
                    dbo.collection("ork_ids").findOne({ discord_id: message.author.id }, function (err, result) {
                        if (err) throw err;
                        if (result === null) {
                            message.reply("Associate an ORK Id using *!ab myork id [ork_username]*");
                            return;
                        }
                        message.reply("Your associated ORK ID is " + result.ork_id);
                        db.close();
                    });
                });
                return;
            }
            if (args.length === 2 && args[0] === 'id') {
                var playerSearch = args.slice(1).join(" ");
                jsork.searchservice.searchPlayer(playerSearch).then(function (players) {
                    if (!players.length) {
                        message.reply("no matches for [" + playerSearch + "]");
                        return;
                    }
                    if (players.length > 1) {
                        var chooseFrom = "Multiple players: ";
                        players.forEach(function (aResult, index) {
                            chooseFrom += "*" + aResult.UserName + "*";
                            if (index < players.length - 1) {
                                chooseFrom += ", ";
                            }
                        });
                        message.reply(chooseFrom);
                        return;
                    }
                    var player = players[0];
                    MongoClient.connect(url, function(err, db) {
                        if (err) throw err;
                        var dbo = db.db("amtbot");
                        var myobj = { $set: { discord_id: message.author.id, ork_id: player.UserName, ork_mundane_id: player.MundaneId }};
                        dbo.collection("ork_ids").updateOne({ discord_id: message.author.id }, myobj, { upsert: true }, function(err, res) {
                          if (err) throw err;
                          message.reply("Your discord account is now associated with the ORK id " + player.UserName);
                          db.close();
                        });
                    });
                });
                return;
            }
            if (args.length === 1 && args[0] === 'remove_id') {
                MongoClient.connect(url, function(err, db) {
                    if (err) throw err;
                    var dbo = db.db("amtbot");
                    dbo.collection("ork_ids").deleteOne({ discord_id: message.author.id }, function(err, res) {
                      if (err) throw err;
                      message.reply("Your discord account is no longer associated with an ORK id");
                      db.close();
                    });
                });
                return;
            }
            var helpEmbed = {
                color: 3447003,
                title: "!ab myork",
                description: "Associate your discord account with an ORK account",
                fields: []
            };
            helpEmbed.fields.push({ name: "!ab myork", value: "Displays your associated ORK account", inline: false });
            helpEmbed.fields.push({ name: "!ab myork id [ork_player_name]", value: "Associate your discord account with an ORK account", inline: false });
            helpEmbed.fields.push({ name: "!ab myork remove_id", value: "Remove any association between your discord account and the ORK", inline: false });
            helpEmbed.fields.push({ name: "!ab myork help", value: "Displays this help.", inline: false });
            message.reply({ embed: helpEmbed });
            break;
        case "kentestingignore":
            // console.log("message");
            // console.log(JSON.stringify(message));
            // console.log("message.guild");
            // console.log(JSON.stringify(message.guild));
            // console.log("members");
            // console.log(JSON.stringify(message.guild.members));
            // console.log("members.cache");
            console.log("all members");
            message.guild.members.cache.forEach(function (aUser) {
                console.log(JSON.stringify(aUser.user));
                console.log(aUser.user.username + ": " + aUser.presence.status);
            });
            // console.log(JSON.stringify(message.guild.members.cache));
            // console.log("client.users");
            // console.log(JSON.stringify(client.users));
            // console.log("client.users.cache");
            // console.log(JSON.stringify(client.users.cache));
            // console.log("client.users as array");
            // console.log(JSON.stringify(client.users.cache.array()));

            // console.log("all users?");
            // client.users.cache.forEach(function(aUser) {
            //     console.log(JSON.stringify(aUser));
            // });

            // console.log(JSON.stringify(client.users.cache[0]));
            // guild = client.guilds.get(message.guildID);
            // console.log("guild");
            // console.log(guild);
            // console.log("online");
            // console.log(message.guild.members.filter(m => m.presence.status === 'online'));
            break;
        case "roll":
            var dieNumber = Number(args[0]);
            if (args.length === 1 && /^\d+$/.test(args[0]) && dieNumber > 0) {
                var randomInteger = Math.floor(Math.random() * Math.floor(dieNumber)) + 1;
                message.reply("Roll " + dieNumber + " and get " + randomInteger);
                // message.author.send("Roll " + dieNumber + " and get " + randomInteger);
            } else {
                message.reply("Provide a number to randomize. Eg. *!ab roll 20*");
                return;
            }
            break;
        case "spell":
            if (args.length === 0) {
                var helpEmbed = {
                    color: 3447003,
                    title: "!ab spell [search term]",
                    description: "Look up an Amtgard spell by name. The lookup is by a concatenated short name.",
                    fields: []
                };
                helpEmbed.fields.push({ name: "!ab spell heatweapon", value: "An exact match for the spell", inline: false });
                helpEmbed.fields.push({ name: "!ab spell ball", value: "Will show multiple results to pick from", inline: false });
                helpEmbed.fields.push({ name: "!ab spell", value: "Displays this help.", inline: false });
                message.reply({ embed: helpEmbed });
                return;
            }
            var aSpell = args[0];
            fuzzyResults = FuzzySort.go(aSpell, Object.keys(allSpells));
            if (!fuzzyResults.length) {
                message.reply("no matches for [" + aSpell + "]");
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
                message.reply(chooseFrom);
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
                message.reply("Provide a player to display. Eg. *!ab player lord_kismet_shenchu*");
                return;
            }
            var playerSearch = args.join(' ');

            jsork.searchservice.searchPlayer(playerSearch).then(function (players) {
                if (!players.length) {
                    message.reply("no matches for [" + playerSearch + "]");
                    return;
                }
                if (players.length > 1) {
                    var chooseFrom = "Multiple players: ";
                    players.forEach(function (aResult, index) {
                        chooseFrom += "*" + aResult.UserName + "*";
                        if (index < players.length - 1) {
                            chooseFrom += ", ";
                        }
                    });
                    message.reply(chooseFrom);
                    return;
                }
                var player = players[0];
                jsork.player.getClasses(player.MundaneId).then(function (classes) {
                    var playerEmbed = {
                        color: 3447003,
                        title: player.UserName + ' (' + player.Persona + ')',
                        url: 'https://ork.amtgard.com/orkui/index.php?Route=Player/index/' + player.MundaneId,
                        fields: []
                    };
                    playerEmbed.fields.push({ name: "Park", value: player.ParkName, inline: true });
                    playerEmbed.fields.push({ name: "Kingdom", value: player.KingdomName, inline: true });
                    playerEmbed.fields.push(
                        { name: '\u200B', value: '\u200B' }
                    );
                    var classNames = classes.map(function (aClass) { return aClass.class });
                    var classLevels = classes.map(function (aClass) { return aClass.level });
                    var classCredits = classes.map(function (aClass) { return aClass.credits });
                    playerEmbed.fields.push(
                        { name: "Class", value: classNames, inline: true }
                    );
                    playerEmbed.fields.push(
                        { name: "Level", value: classLevels, inline: true }
                    );
                    playerEmbed.fields.push(
                        { name: "Credits", value: classCredits, inline: true }
                    );
                    message.channel.send({ embed: playerEmbed });
                });
            });
            break;
        case "help":
        default:
            var helpEmbed = {
                color: 3447003,
                title: "!ab",
                description: "Amtgard bot for discord. Various commands to help with immersion. See the growing list of commands below.",
                fields: []
            };
            helpEmbed.fields.push({ name: "!ab myork", value: "Associate your discord account with your ORK account", inline: false });
            helpEmbed.fields.push({ name: "!ab player", value: "Look up an Amtgard player in the ORK", inline: false });
            helpEmbed.fields.push({ name: "!ab spell", value: "Look up an Amtgard spell and display the information about it", inline: false });
            // helpEmbed.fields.push({ name: "!ab attendance", value: "Start tracking attendance for an online event", inline: false });
            helpEmbed.fields.push({ name: "!ab help", value: "Show this help information", inline: false });
            helpEmbed.footer = { text: "Contact Ken Walker on Facebook for help" };
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

client.login(config.token);