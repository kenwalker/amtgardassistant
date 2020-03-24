const Discord = require("discord.js");
const FuzzySort = require("./fuzzysort.js");
const jsork = require("./jsork.js");
const https = require('https');
$ = require("jquery");

// jsork.player.getClasses(43232).then(function(classes) {
//     console.log(JSON.stringify(classes));
// });

// jsork.kingdom.getKingdoms().then(function(kingdoms) {
//     console.log(kingdoms.length);
// });

// jsork.searchservice.searchPlayer('lord_kismet').then(function(players) {
//     console.log(JSON.stringify(players));
// });

const client = new Discord.Client();

const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

var allSpells = require('./spells.json');

client.on("ready", () => {
    client.user.setActivity(`Type !help for info`);
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
    const command = args.shift().toLowerCase();

    switch (command) {
        case "spell":
            if (args.length === 0) {
                message.reply("Provide a spell to display. Eg. *!spell heal*");
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
                fuzzyResults.forEach(function(aResult, index) {
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
                Object.keys(aSpell.classes).forEach(function(aClass, index) {
                    classes += aClass;
                    classes += " (" + aSpell.classes[aClass] + ") ";
                })
                spellEmbed.fields.push({ name: "Classes", value: classes, inline: false});
                if (aSpell.t) {
                    spellEmbed.fields.push({ name: "Type", value: aSpell.t, inline: true});
                }
                if (aSpell.s) {
                    spellEmbed.fields.push({ name: "School", value: aSpell.s, inline: true});
                }
                if (aSpell.r) {
                    spellEmbed.fields.push({ name: "Range", value: aSpell.r, inline: true});
                }
                if (aSpell.i) {
                    spellEmbed.fields.push({ name: "Incant", value: strip_html_tags(aSpell.i), inline: false});
                }
                if (aSpell.m) {
                    spellEmbed.fields.push({ name: "Materials", value: strip_html_tags(aSpell.m), inline: false});
                }
                if (aSpell.e) {
                    spellEmbed.fields.push({ name: "Effect", value: strip_html_tags(aSpell.e), inline: false});
                }
                if (aSpell.l) {
                    spellEmbed.fields.push({ name: "Limitations", value: strip_html_tags(aSpell.l), inline: false});
                }
                if (aSpell.n) {
                    spellEmbed.fields.push({ name: "Notes", value: strip_html_tags(aSpell.n), inline: false});
                }
                message.channel.send({ embed: spellEmbed });
            }
            break;
        case "player":
            if (args.length === 0) {
                message.reply("Provide a player to display. Eg. *!player lord_kismet_shenchu*");
                return;
            }
            var playerSearch = args.join(' ');

            jsork.searchservice.searchPlayer(playerSearch).then(function(players) {
                if (!players.length) {
                    message.reply("no matches for [" + playerSearch + "]");
                    return;
                }
                if (players.length > 1) {
                    var chooseFrom = "Multiple players: ";
                    players.forEach(function(aResult, index) {
                        chooseFrom += "*" + aResult.UserName + "*";
                        if (index < players.length - 1) {
                            chooseFrom += ", ";
                        }
                    });
                    message.reply(chooseFrom);
                    return;
                }
                var player = players[0];
                jsork.player.getClasses(player.MundaneId).then(function(classes) {
                    var playerEmbed = {
                        color: 3447003,
                        title: player.UserName + ' (' + player.Persona + ')',
                        url: 'https://ork.amtgard.com/orkui/index.php?Route=Player/index/' + player.MundaneId,
                        fields: []
                    };
                    playerEmbed.fields.push({ name: "Park", value: player.ParkName, inline: true});
                    playerEmbed.fields.push({ name: "Kingdom", value: player.KingdomName, inline: true});
                    playerEmbed.fields.push(
                        { name: '\u200B', value: '\u200B' }
                    );
                    var classNames = classes.map(function(aClass) { return aClass.class });
                    var classLevels = classes.map(function(aClass) { return aClass.level });
                    var classCredits = classes.map(function(aClass) { return aClass.credits });
                    playerEmbed.fields.push(
                        { name: "Class", value: classNames, inline: true}
                    );
                    playerEmbed.fields.push(
                        { name: "Level", value: classLevels, inline: true}
                    );
                    playerEmbed.fields.push(
                        { name: "Credits", value: classCredits, inline: true}
                    );
                    message.channel.send({ embed: playerEmbed });
                });
            });
            break;
        case "help":
            message.reply("Use *!player [playername]* or *!spell [spellname]*");
            break;
        default:
            message.reply("Try *!help* or *!player [playername]* or *!spell [spellname]*");
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