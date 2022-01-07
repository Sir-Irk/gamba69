import fs from 'fs';
import Discord from 'discord.js';
const { Client } = Discord;

import { boneSymbol, slotSymbols } from './symbols.mjs';
import { slotPoints } from './slots.mjs';
import { GIFS, EMOJIS } from './media.mjs';
import { user_account, user_guild } from './user.mjs';
import { Canvas, fillWithEmoji } from 'discord-emoji-canvas';

export const userDataJsonPath = 'user_data.json';

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const client = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
export const prefix = '?';

export let userGuilds = [];

export function verify_bet(user, bet, msg) {
    let str = `${user.nickname}, `;
    if (isNaN(bet) || bet === null || bet <= 0) {
        for (let i = 0; i < 10; ++i) {
            str += `${EMOJIS.doubtfulSharkEmoji}`;
        }
        msg.reply(str);
        return false;
    }
    if (user.bones < bet) {
        msg.reply(`${user.nickname}, you don't have enough bones to bet **${bet}**. You have **${user.bones}** ${boneSymbol}`);
        return false;
    }
    return true;
}

export function user_is_playing_game(user, msg) {
    if (user.isPlayingGame) {
        msg.reply(`${user.nickname}, You are already playing a game`);
        return true;
    }
    return false;
}

export function get_thousands_int(inStr) {
    let result = 0;
    if (inStr.length > 0 && inStr[inStr.length - 1].toLowerCase() == 'k') {
        let bones = parseFloat(inStr.substring(0, inStr.length - 1));
        if (isNaN(bones)) {
            return -1;
        }
        result = Math.round(bones * 1000);
    }
    return result;
}

export function get_percentage_int(bones, inStr) {
    let result = 0;
    if (inStr.length > 0 && inStr[inStr.length - 1] == '%') {
        const str = inStr.substring(0, inStr.length - 1);
        const percentage = parseFloat(str);
        if (isNaN(percentage) || percentage < 0) {
            result = -1;
        } else {
            result = Math.round(bones * Math.max(0, Math.min(1, percentage / 100)));
        }
    }

    return result;
}

export function shuffle(array) {
    let currentIndex = array.length,
        randomIndex;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function get_user_by_nickname(userAccounts, nickname) {
    if (!nickname) return null;

    for (let i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].nickname.toLowerCase() === nickname.toLowerCase()) {
            return userAccounts[i];
        }
    }
    return null;
}

export function get_user_by_name(userAccounts, username) {
    if (!username) return null;
    for (let i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].name.toLowerCase() === username.toLowerCase()) {
            return userAccounts[i];
        }
    }
    return null;
}

export function get_user(userAccounts, id) {
    for (let i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].id === id) {
            return userAccounts[i];
        }
    }
    return null;
}

export function get_guild(guilds, id) {
    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === id) {
            return guilds[i];
        }
    }
    return null;
}

export async function get_nickname(username, msg) {
    let nickname = username;
    let guildObj = await client.guilds.fetch(msg.guild.id);
    if (guildObj) {
        user = await guildObj.members.fetch(msg.author.id);
        if (user) {
            if (user.nickname) {
                nickname = user.nickname;
            }
        }
    }
    return nickname;
}

export async function give_user_bones(users, gifter, receiverName, amount, msg) {
    if (gifter.bones < amount) {
        msg.reply(`${gifter.name}, you don't have enough bones to give that much. you have **${gifter.bones.toLocaleString('en-US')}** ${boneSymbol}`);
        return;
    }

    let receiver = get_user(users, receiverName);
    if (!receiver) {
        let receiver = get_user_by_name(users, receiverName);
        if (!receiver) {
            receiver = get_user_by_nickname(users, receiverName);
            if (!receiver) {
                msg.reply(`${gifter.name}, Failed to give bones. User not found.`);
                return;
            }
        }
    }

    if (receiver.id === gifter.id) {
        msg.reply(`You can't give yourself bones, you dangus`);
        return;
    }
    receiver.bones += amount;
    gifter.bones -= amount;
    write_user_data_json(gifter);
    write_user_data_json(receiver);
    msg.reply(`${receiver.name}, ${gifter.name} just gave you **${amount.toLocaleString('en-US')}** ${boneSymbol}`);
}

export async function print_richest_list(users, msg) {
    users.sort(function (usr0, usr1) {
        const a = usr0.bones;
        const b = usr1.bones;
        return a < b ? 1 : a > b ? -1 : 0;
    });
    let leaderboard = new String();

    let sum = 0;
    for (let i = 0; i < users.length; ++i) {
        sum += users[i].bones;
    }

    let names = [];
    let scores = [];

    for (let i = 0; i < users.length && i < 10; i++) {
        const usr = users[i];
        if (i == 0) {
            names.push(`:first_place:  ${usr.nickname}`);
        } else if (i == 1) {
            names.push(`:second_place: ${usr.nickname} `);
        } else if (i == 2) {
            names.push(`:third_place:  ${usr.nickname}`);
        } else {
            names.push(`**${i + 1}th**  ${usr.nickname}`);
        }
        let percentage = 0;
        if (sum > 0) {
            percentage = Math.round((usr.bones / sum) * 100);
        }
        scores.push(`\n${boneSymbol} ${usr.bones.toLocaleString('en-US')} (${percentage.toLocaleString('en-US')}%)\n`);
    }
    const embed = new Discord.MessageEmbed().setTitle(`${boneSymbol} Top 10 Richest ${boneSymbol}`).setColor('#00AAFF');

    for (let i = 0; i < names.length; ++i) {
        embed.addFields({ name: names[i], value: scores[i], inline: false });
    }

    embed.addFields({
        name: `:computer: Server Total`,
        value: `${boneSymbol} ${sum.toLocaleString('en-US')}`,
        inline: false,
    });

    embed.addFields({
        name: `${EMOJIS.interestedSharkEmoji} House(Kevin)`,
        value: `${boneSymbol} ${users[0].guildObj.houseBones.toLocaleString('en-US')}`,
        inline: false,
    });

    await msg.channel.send({ embeds: [embed] });
}

let isWritingJSONfile = false;
export function write_user_data_json(user) {
    while (isWritingJSONfile) {}
    isWritingJSONfile = true;
    let file = fs.readFileSync(userDataJsonPath);
    let json = JSON.parse(file);
    const id = user.id;
    const guild = user.guild;
    const guildObj = user.guildObj;
    if (!json[guild]) {
        json[guild] = { guild_name: user.guildName, gamesPlayed: 0, houseBones: guildObj.houseBones };
    }

    json[guild].gamesPlayed = guildObj.gamesPlayed;
    json[guild].diceGamesPlayed = guildObj.diceGamesPlayed;
    json[guild].rlGamesPlayed = guildObj.rlGamesPlayed;
    json[guild].bjGamesPlayed = guildObj.bjGamesPlayed;
    json[guild].slotsGamesPlayed = guildObj.slotsGamesPlayed;

    json[guild].diceGamesWon = guildObj.diceGamesWon;
    json[guild].rlGamesWon = guildObj.rlGamesWon;
    json[guild].bjGamesWon = guildObj.bjGamesWon;
    json[guild].slotsGamesWon = guildObj.slotsGamesWon;

    json[guild][id] = {
        username: user.name,
        bones: user.bones,
        dailyCollectionTime: user.dailyCollectionTime,
        dailyStreak: user.dailyStreak,
        workStartTime: user.workStartTime,
        workPaycheck: user.workPaycheck,
        charityCollectionTime: user.charityCollectionTime,

        diceGamesPlayed: user.diceGamesPlayed,
        rlGamesPlayed: user.rlGamesPlayed,
        bjGamesPlayed: user.bjGamesPlayed,
        slotsGamesPlayed: user.slotsGamesPlayed,

        diceGamesWon: user.diceGamesWon,
        rlGamesWon: user.rlGamesWon,
        bjGamesWon: user.bjGamesWon,
        slotsGamesWon: user.slotsGamesWon,

        diceGamesBonesWon: user.diceGamesBonesWon,
        rlGamesBonesWon: user.rlGamesBonesWon,
        bjGamesBonesWon: user.bjGamesBonesWon,
        slotsGamesBonesWon: user.slotsGamesBonesWon,
    };
    fs.writeFileSync(userDataJsonPath, JSON.stringify(json, null, 2));
    isWritingJSONfile = false;
}

export async function load_users() {
    let str = new String(userDataJsonPath);
    let file = fs.readFileSync(userDataJsonPath);
    let json = JSON.parse(file);

    for (const guildKey in json) {
        //if (guildKey !== `922243045787852890`) continue;
        let guild = new user_guild(guildKey);

        const g = json[guildKey];
        let guildObj = await client.guilds.fetch(guildKey);
        if (g.gamesPlayed !== undefined) guild.gamesPlayed = g.gamesPlayed;
        if (g.houseBones !== undefined) guild.houseBones = g.houseBones;
        if (g.diceGamesPlayed !== undefined) guild.diceGamesPlayed = g.diceGamesPlayed;
        if (g.rlGamesPlayed !== undefined) guild.rlGamesPlayed = g.rlGamesPlayed;
        if (g.bjGamesPlayed !== undefined) guild.bjGamesPlayed = g.bjGamesPlayed;
        if (g.slotsGamesPlayed !== undefined) guild.slotsGamesPlayed = g.slotsGamesPlayed;
        if (g.diceGamesWon !== undefined) guild.diceGamesWon = g.diceGamesWon;
        if (g.rlGamesWon !== undefined) guild.rlGamesWon = g.rlGamesWon;
        if (g.bjGamesWon !== undefined) guild.bjGamesWon = g.bjGamesWon;
        if (g.slotsGamesWon !== undefined) guild.slotsGamesWon = g.slotsGamesWon;
        userGuilds.push(guild);

        let guildName = '';
        for (const userKey in json[guildKey]) {
            const u = json[guildKey][userKey];
            if (u.bones === null || u.bones === undefined) {
                guildName = u.guild_name;
                continue;
            }

            let nickname = u.username;
            if (guildObj) {
                let m = null;
                try {
                    m = await guildObj.members.fetch(userKey);
                } catch {
                    continue;
                }

                nickname = m.nickname;
                if (!nickname) {
                    nickname = u.username;
                }
            }

            let user = new user_account(u.username, userKey, nickname, guildKey, guildName, guild, u.bones);
            user.dailyCollectionTime = u.dailyCollectionTime;
            if (u.workStartTime !== undefined) user.workStartTime = u.workStartTime;
            if (u.workPaycheck !== undefined) user.workPaycheck = u.workPaycheck;
            if (u.dailyStreak !== undefined) user.dailyStreak = u.dailyStreak;
            if (u.charityCollectionTime !== undefined) user.charityCollectionTime = u.charityCollectionTime;

            if (u.diceGamesPlayed !== undefined) user.diceGamesPlayed = u.diceGamesPlayed;
            if (u.rlGamesPlayed !== undefined) user.rlGamesPlayed = u.rlGamesPlayed;
            if (u.bjGamesPlayed !== undefined) user.bjGamesPlayed = u.bjGamesPlayed;
            if (u.slotsGamesPlayed !== undefined) user.slotsGamesPlayed = u.slotsGamesPlayed;

            if (u.diceGamesWon !== undefined) user.diceGamesWon = u.diceGamesWon;
            if (u.rlGamesWon !== undefined) user.rlGamesWon = u.rlGamesWon;
            if (u.bjGamesWon !== undefined) user.bjGamesWon = u.bjGamesWon;
            if (u.slotsGamesWon !== undefined) user.slotsGamesWon = u.slotsGamesWon;

            if (u.diceGamesBonesWon !== undefined) user.diceGamesBonesWon = u.diceGamesBonesWon;
            if (u.rlGamesBonesWon !== undefined) user.rlGamesBonesWon = u.rlGamesBonesWon;
            if (u.bjGamesBonesWon !== undefined) user.bjGamesBonesWon = u.bjGamesBonesWon;
            if (u.slotsGamesBonesWon !== undefined) user.slotsGamesBonesWon = u.slotsGamesBonesWon;

            guild.users.push(user);
            console.log(`Loaded user: ${u.username} for guild ${json[guildKey].guild_name}`);
        }
    }
}

export async function display_user_stats(user, msg) {
    const gamesPlayed = user.bjGamesPlayed + user.diceGamesPlayed + user.slotsGamesPlayed + user.rlGamesPlayed;
    let winSum = user.bjGamesWon + user.diceGamesWon + user.slotsGamesWon + user.rlGamesWon;
    let boneSum = user.bjGamesBonesWon + user.diceGamesBonesWon + user.slotsGamesBonesWon + user.rlGamesBonesWon;

    const winPercentage = gamesPlayed > 0 ? Math.round((winSum / gamesPlayed) * 100) : 0;
    const bjWinPercentage = user.bjGamesPlayed > 0 ? Math.round((user.bjGamesWon / user.bjGamesPlayed) * 100) : 0;
    const rlWinPercentage = user.rlGamesPlayed > 0 ? Math.round((user.rlGamesWon / user.rlGamesPlayed) * 100) : 0;
    const diceWinPercentage = user.diceGamesPlayed > 0 ? Math.round((user.diceGamesWon / user.diceGamesPlayed) * 100) : 0;
    const slotsWinPercentage = user.slotsGamesPlayed > 0 ? Math.round((user.slotsGamesWon / user.slotsGamesPlayed) * 100) : 0;

    const boneSumStr = boneSum.toLocaleString('en-US');
    const bjBonesStr = user.bjGamesBonesWon.toLocaleString('en-US');
    const slotsBonesStr = user.slotsGamesBonesWon.toLocaleString('en-US');
    const rlBonesStr = user.rlGamesBonesWon.toLocaleString('en-US');
    const diceBonesStr = user.diceGamesBonesWon.toLocaleString('en-US');

    const embed = new Discord.MessageEmbed()
        .setTitle(`${user.nickname}'s Stats`)
        .setColor('#AA0090')
        .addFields(
            {
                name: `**All**`,
                value: `Played: ${gamesPlayed}\nWon: ${winSum} (${winPercentage}%)\nBones Won: ${boneSumStr} ${boneSymbol}`,
                inline: false,
            },
            {
                name: `**Blackjack**`,
                value: `Played: ${user.bjGamesPlayed}\nWon: ${user.bjGamesWon} (${bjWinPercentage}%)\nBones Won: ${bjBonesStr} ${boneSymbol}`,
                inline: false,
            },
            {
                name: `**Slots**`,
                value: `Played: ${user.slotsGamesPlayed}\nWon: ${user.slotsGamesWon} (${slotsWinPercentage}%)\nBones Won: ${slotsBonesStr} ${boneSymbol}`,
                inline: false,
            },
            {
                name: `**Russian Roulette**`,
                value: `Played: ${user.rlGamesPlayed}\nWon: ${user.rlGamesWon} (${rlWinPercentage}%)\nBones Won: ${rlBonesStr} ${boneSymbol}`,
                inline: false,
            },
            {
                name: `**Dice**`,
                value: `Played: ${user.diceGamesPlayed}\nWon: ${user.diceGamesWon} (${diceWinPercentage}%)\nBones Won: ${diceBonesStr} ${boneSymbol}`,
                inline: false,
            },
            {
                name: `Extra:`,
                value: `Stats recorded since 1/4/22`,
                inline: false,
            }
        );
    await msg.reply({ embeds: [embed] });
}

export async function display_games(msg) {
    const embed = new Discord.MessageEmbed()
        .setTitle('Games')
        .setColor('#008800')
        .addFields(
            { name: `${prefix}dice <bet>`, value: `Roll the dice and hope for the best`, inline: false },
            {
                name: `${prefix}roulette <bet>  or  ${prefix}rl <bet>`,
                value: `Russian Roulette. Risk your life if you have the balls`,
                inline: false,
            },
            { name: `${prefix}blackjack <bet>  or  ${prefix}bl <bet>`, value: `Good old Blackjack`, inline: false }
        );

    let str = '\n';
    for (let y = 0; y < slotSymbols.length; ++y) {
        for (let x = 0; x < slotSymbols[y].length; ++x) {
            str += `${slotSymbols[y][x]} = ${slotPoints[x]}x, `;
        }
        str += '\n';
    }
    embed.addFields({ name: `${prefix}slots <bet>  or  ${prefix}sl <bet>`, value: str, inline: false });
    embed.addFields({
        name: `Tips`,
        value: `you can type "all" for your bet to bet all of your bones\n\nYou can do shorthand versions of in-game commands\nh = hit, s = stand, c = continue, e = end`,
        inline: false,
    });

    await msg.reply({ embeds: [embed] });
}

export async function display_help(msg) {
    const embed = new Discord.MessageEmbed()
        .setTitle('Commands')
        .setColor('#C69B6D')
        .addFields(
            { name: `${prefix}daily`, value: 'Get your daily bonus. Consecutive days give a bonus', inline: false },
            { name: `${prefix}work`, value: 'Make yourself useful. Earn a paycheck after a duration', inline: false },
            { name: `${prefix}games`, value: 'Lists games you can play', inline: false },
            { name: `${prefix}bones`, value: 'Display your bone balance', inline: false },
            { name: `${prefix}richest`, value: 'Display the top 10 richest users on the server', inline: false },
            { name: `${prefix}give <user> <amount>`, value: 'Give your bones to another user', inline: false },
            {
                name: `${prefix}rain <amount> <number of users>(optional)`,
                value: 'Make it rain on random people in the server. "Amount" is divided amongst everyone unless you specify a number of users',
                inline: false,
            },
            { name: `${prefix}stats`, value: 'Display your stats for casino games', inline: false },
            { name: `${prefix}charity`, value: 'For the less fortunate. Receive a small donation if you are broke', inline: false },
            { name: `${prefix}house`, value: 'Show how many bones I the house(aka Kevin) has', inline: false },
            { name: `${prefix}kys`, value: "Tells me to kill myself... I'll do it too", inline: false }
        );

    await msg.reply({ embeds: [embed] });
}

export function parse_bet(user, arg, msg) {
    let bet = get_percentage_int(user.bones, arg);
    if (bet === 0) bet = get_thousands_int(arg);

    if (bet === 0) {
        const parsedArg = parseInt(arg);
        bet = arg.toLowerCase() === 'all' ? user.bones : parsedArg;
        if (isNaN(bet)) {
            bet = 0;
        }
    }

    if (bet <= 0) {
        msg.reply(`Error: Invalid amount of bones`);
        return 0;
    }

    return bet;
}

export class graphics {
    blackjackBackground = Canvas.loadImage('./images/green_felt.jpg');
    slotsBackground = Canvas.loadImage('./images/slots_test.png');
    youBustedTestImage = Canvas.loadImage('./images/you_busted_test.png');
}

export async function load_graphics(graphicsObj) {
    //console.log('Initialized graphics');
}

export let graphicsObj = new graphics();
