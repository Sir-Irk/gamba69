import Discord, { Emoji, TextChannel } from 'discord.js';
import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('config.json').toString());

import { user_account, user_guild } from './src/user.js';
import { blackjack_game_continue, blackjack_game, blackjack_option } from './src/blackjack.js';
import { roulette_game, roulette_game_continue } from './src/russian_roulette.js';
import { dice_game } from './src/dice.js';
import { slots_game } from './src/slots.js';
import { make_it_rain } from './src/rain.js';
import { cfg } from './src/bot_cfg.js';
import { dayInMili, hourInMili, minInMili } from './src/constants.js';
import { boneSymbol } from './src/symbols.js';
import { EMOJIS, GIFS } from './src/media.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

import {
    client,
    userGuilds,
    get_guild,
    get_user,
    get_nickname,
    write_user_data_json,
    user_is_playing_game,
    give_user_bones,
    load_users,
    load_graphics,
    print_richest_list,
    display_user_stats,
    display_games,
    display_help,
    parse_bet,
    prefix,
    display_guild_stats,
} from './src/utils.js';

import {
    close_horse_race_betting,
    list_horses,
    process_horse_race_bet,
    purchase_horse,
    start_horse_purchase,
    start_horse_race,
    start_horse_race_bet_taking,
} from './src/horse_racing.js';
import { finished } from 'stream';

let botInitialized = false;

async function initialize() {
    await load_graphics();
    await load_users();
    console.log('finished loading users');
    botInitialized = true;
}

initialize();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

async function start_working(user: user_account, msg: Discord.Message<boolean>) {
    if (user_is_playing_game(user, msg)) return;

    const timeSpent = Date.now() - user.workStartTime;
    if (user.workPaycheck > 0 && timeSpent < cfg.workDuration) {
        const timeLeft = cfg.workDuration - timeSpent;
        const minutes = Math.floor((timeLeft * 0.001) / 60);
        const minutesInMili = minutes * minInMili;
        const secondsLeft = Math.round((timeLeft - minutesInMili) * 0.001);
        await msg.reply(
            `You are already working. Come back in **${minutes}m ${secondsLeft}s** to claim your paycheck of **${user.workPaycheck.toLocaleString(
                'en-US'
            )}** ${boneSymbol} and start working again`
        );
    } else if (user.workPaycheck > 0 && timeSpent >= cfg.workDuration) {
        user.bones += user.workPaycheck;
        user.guildObj.houseBones -= user.workPaycheck;
        const range = cfg.workSalaryMax - cfg.workSalaryMin;
        const paycheck = Math.floor(cfg.workSalaryMin + (Math.random() + 1) * range);
        user.workStartTime = Date.now();
        await msg.reply(
            `${user.nickname}, Here is your paycheck of **${user.workPaycheck.toLocaleString(
                'en-US'
            )}** ${boneSymbol} , come back in an hour to claim your paycheck of **${paycheck.toLocaleString('en-US')}** ${boneSymbol}`
        );
        msg.channel.send(`${GIFS.toCashFlowGif}`);
        user.workPaycheck = paycheck;
    } else if (user.workPaycheck == 0) {
        const range = cfg.workSalaryMax - cfg.workSalaryMin;
        user.workPaycheck = Math.round(cfg.workSalaryMin + (Math.random() + 1) * range);
        user.workStartTime = Date.now();
        await msg.reply(
            `${user.nickname}, You started working. Your paycheck will be **${user.workPaycheck.toLocaleString(
                'en-US'
            )}** ${boneSymbol} , come back in an hour to claim it and start working again`
        );
    }
}

async function daily_bones(user: user_account, msg: Discord.Message<boolean>) {
    const timeSinceLastDaily = Date.now() - user.dailyCollectionTime;
    if (user.dailyCollectionTime == 0 || timeSinceLastDaily >= cfg.dailyCollectionInterval) {
        const mul = Math.min(7, user.dailyStreak + 1);
        user.bones += cfg.dailyBonus * mul;
        user.guildObj.houseBones -= cfg.dailyBonus * mul;
        const dailyBonesStr = (cfg.dailyBonus * mul).toLocaleString('en-US');
        if (user.dailyStreak > 0) {
            msg.reply(
                `${EMOJIS.imBigEmoji} You have collected your daily bonus of **${dailyBonesStr}** ${boneSymbol} , you earned **${mul}x** from your streak bonus!`
            );
        } else {
            msg.reply(`${EMOJIS.imBigEmoji} You have collected your daily bonus of **${dailyBonesStr}** ${boneSymbol}`);
        }
        user.dailyStreak++;
        user.dailyCollectionTime = Date.now();
    } else {
        const timeLeft = cfg.dailyCollectionInterval - timeSinceLastDaily;
        const hours = Math.floor((timeLeft * 0.001) / 60 / 60);
        const hoursInMili = hours * hourInMili;
        const minutes = Math.round(((timeLeft - hoursInMili) * 0.001) / 60);
        msg.reply(`${user.nickname}, You need to wait **${hours}h** **${minutes}m** before collecting your daily bonus again`);
    }
}

client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    //if (msg.guildId !== `922243045787852890`) return;
    if (msg.content.startsWith(prefix)) return;
    if (!botInitialized) return;

    let guild: user_guild = get_guild(userGuilds, msg.guild.id);
    if (!guild) {
        guild = new user_guild(msg.guild.id);
        userGuilds.push(guild);
    }

    let user: user_account = get_user(guild.users, msg.author.id);
    if (!user) {
        const nickname = await get_nickname(msg.author.username, msg);
        user = new user_account(msg.author.username, msg.author.id, nickname, msg.guild.id, msg.guild.name, guild, 0);
        guild.users.push(user);
    }
    write_user_data_json(user);

    if (user.isBuyingHorse) {
        await purchase_horse(user, msg.content, msg);
        return;
    }

    switch (msg.content.toLowerCase()) {
        case 'continue':
        case 'c':
            await roulette_game_continue(user, msg);
            write_user_data_json(user);
            break;

        case 'end':
        case 'e':
            {
                if (user.isPlayingGame && user.rl.counter > 0) {
                    user.isPlayingGame = false;
                    user.rl.counter = 0;
                    await msg.channel.send(`${user.nickname}, You have ended the game of roulette`);
                }
            }
            break;

        case 'hit':
        case 'h':
            await blackjack_game_continue(user, msg, blackjack_option.hit);
            write_user_data_json(user);
            break;
        case 's':
        case 'stand':
            await blackjack_game_continue(user, msg, blackjack_option.stand);
            write_user_data_json(user);
            break;
        case 'd':
        case 'dd':
        case 'double':
            await blackjack_game_continue(user, msg, blackjack_option.doubleDown);
            write_user_data_json(user);
            break;

        case 'surrender':
        case 'resign':
        case 'r':
            await blackjack_game_continue(user, msg, blackjack_option.resign);
            write_user_data_json(user);
            break;
    }
});

const casinoChannel = `<#923887321517031434>`;
const noGambaPic = `https://i.imgur.com/I49CZW7.png`;
client.on('messageCreate', async (msg) => {
    //if (msg.guildId !== `922243045787852890`) return;
    if (msg.author.bot) return;
    if (!msg.content.startsWith(prefix)) return;
    if (!botInitialized) {
        msg.reply('Bot is booting up');
        return;
    }

    // if (msg.channel.name.includes('general')) {
    const channel: TextChannel = msg.channel as TextChannel;
    if (channel.name != undefined) {
        if (channel.name.includes('general')) {
            await msg.reply(`Please use ${casinoChannel} for gamba commands`);
            await msg.channel.send(`${noGambaPic}`);
            return;
        }
    }

    const body = msg.content.slice(prefix.length);
    const args = body.split(' ');
    const command = args.shift().toLowerCase();

    let guild = get_guild(userGuilds, msg.guild.id);
    if (!guild) {
        guild = new user_guild(msg.guild.id);
        userGuilds.push(guild);
        console.log(`Adding guild: ${guild.id}`);
    }

    let user = get_user(guild.users, msg.author.id);
    if (!user) {
        const nickname = await get_nickname(msg.author.username, msg);
        user = new user_account(msg.author.username, msg.author.id, nickname, msg.guild.id, msg.guild.name, guild, 0);
        guild.users.push(user);
    }

    switch (command) {
        /*
        case 'write':
            {
                guild.users.forEach((u: user_account) => {
                    console.log(`Wrote user: ${u.name}`);
                    write_user_data_json(u);
                });
            }
            break;
            */
        case 'ping':
            {
                const timeTaken = Date.now() - msg.createdTimestamp;
                msg.reply(`${EMOJIS.imBigEmoji} Pong! Latency: ${timeTaken}ms`);
            }
            break;

        case 'charity':
            {
                const timeSince = Date.now() - user.charityCollectionTime;
                if (user.bones == 0 && timeSince >= cfg.charityCollectionInterval) {
                    msg.reply(`${EMOJIS.imBigEmoji} Here's your charity donation of **${cfg.charityAmountInBones}** ${boneSymbol}`);
                    user.charityCollectionTime = Date.now();
                    user.bones += cfg.charityAmountInBones;
                    user.guildObj.houseBones -= 50;
                    write_user_data_json(user);
                } else if (user.bones > 0) {
                    msg.reply(`Don't be greedy. You can only claim a charity donation if you have **0** ${boneSymbol}`);
                } else if (timeSince < cfg.charityCollectionInterval) {
                    const timeLeft = cfg.charityCollectionInterval - timeSince;
                    const minutes = Math.floor((timeLeft * 0.001) / 60);
                    const minutesInMili = minutes * minInMili;
                    const secondsLeft = Math.round((timeLeft - minutesInMili) * 0.001);
                    msg.reply(`You need to wait ${minutes} minutes and ${secondsLeft} seconds before using this command again`);
                }
            }
            break;
        case 'daily':
            daily_bones(user, msg);
            write_user_data_json(user);
            break;

        case 'kys':
            {
                msg.reply(`Killing myself...`);
                await msg.channel.send(`${GIFS.kmsGif}`);
            }
            break;

        case 'bones':
            msg.reply(`You have **${user.bones.toLocaleString('en-US')}** ${boneSymbol}`);
            if (Math.random() < 0.2) {
                await msg.channel.send(`${GIFS.bonesEqualDollarsGif}`);
            }
            break;

        case 'richest':
            print_richest_list(guild.users, msg);
            break;

        case 'house':
        case 'houseBones':
            {
                const houseBones = guild.houseBones.toLocaleString('en-US');
                msg.reply(`I have **${houseBones}** ${boneSymbol}`);
            }
            break;

        case 'games':
            await display_games(msg);
            break;

        case 'work':
            start_working(user, msg);
            write_user_data_json(user);
            break;

        case 'give':
            if (args.length < 2) {
                msg.reply(`**usage:** ${prefix}give <user> <amount>`);
                break;
            }
            let bonesToGive = parse_bet(user, args[1], msg);
            if (bonesToGive <= 0) return;

            let nameStr = args[0];
            if (nameStr.length > 3) {
                if (nameStr[0] === '<' && nameStr[1] === '@') {
                    if (nameStr[2] === '!') {
                        nameStr = nameStr.substring(3, nameStr.length - 1);
                    } else {
                        nameStr = nameStr.substring(2, nameStr.length - 1);
                    }
                }
            }
            await give_user_bones(guild.users, user, nameStr, bonesToGive, msg);
            break;

        case 'gstats':
        case 'allstats':
            await display_guild_stats(user.guildObj, msg);
            break;
        case 'stats':
            await display_user_stats(user, msg);
            break;

        case 'rain':
            {
                if (args.length < 1) {
                    msg.reply(`Usage: ?rain <amount> <number of users>\n If you leave number of users blank it will give to all users`);
                    return;
                }

                let bet = parse_bet(user, args[0], msg);
                if (bet <= 0) return;

                let numUsers = 0;
                if (args.length >= 2) {
                    numUsers = parseInt(args[1]);
                    if (isNaN(numUsers) || numUsers <= 0) {
                        msg.reply(
                            `Error: Invalid number of users to rain on. Note: you can also leave the number of users blank to give to all users`
                        );
                        return;
                    }
                }

                make_it_rain(guild.users, user, bet, numUsers, msg);
            }
            break;
        case 'slots':
        case 'sl':
            {
                /*
      if (msg.guildId !== `922243045787852890`) {
          await msg.reply(`Sorry this game is down for maintenance... Be back
      soon`); return;
      }
      */

                if (args.length < 1) {
                    msg.reply(`Error: need a bet amount`);
                    return;
                }

                let bet = parse_bet(user, args[0], msg);
                if (bet > 0) {
                    await slots_game(user, bet, msg);
                    write_user_data_json(user);
                }
            }
            break;
        case 'roulette':
        case 'rl':
            {
                if (args.length < 1) {
                    msg.reply(`Error: need a bet amount`);
                    return;
                }

                let bet = parse_bet(user, args[0], msg);
                if (bet > 0) {
                    await roulette_game(user, bet, msg);
                    write_user_data_json(user);
                }
            }
            break;
        case 'blackjack':
        case 'bj':
            {
                /*
      if (msg.guildId !== `922243045787852890`) {
          await msg.reply(`Sorry this game is down for maintenance... Be back
      soon`); return;
      }
      */

                if (args.length < 1) {
                    msg.reply(`Error: need a bet amount`);
                    return;
                }

                let bet = parse_bet(user, args[0], msg);
                if (bet > 0) {
                    await blackjack_game(user, bet, msg);
                    write_user_data_json(user);
                }
            }
            break;

        case 'dice':
            {
                if (args.length < 1) {
                    msg.reply(`Error: need a bet amount`);
                    return;
                }

                let bet = parse_bet(user, args[0], msg);
                if (bet > 0) {
                    await dice_game(user, bet, msg);
                    write_user_data_json(user);
                }
            }
            break;

        case `shop`: {
            let embed = new Discord.MessageEmbed().setTitle(`Shop`).setColor('#BB2222');
            embed.addFields({ name: ':horse: Horse', value: `${boneSymbol} ${cfg.horseBasePrice.toLocaleString('en-US')}`, inline: true });
            msg.reply({ embeds: [embed] });
            return;
        }

        case `buy`: {
            if (args.length < 1) {
                msg.reply(`**usage**: ?buy <item>`);
                return;
            }
            if (args[0].toLocaleLowerCase() === 'horse') {
                await start_horse_purchase(user, msg);
                return;
            }
        }

        case `stable`:
        case `stables`:
            await list_horses(user, msg);
            break;

        case `hr`:
        case `race`:
        case `horserace`:
            await start_horse_race_bet_taking(user, msg);
            break;

        case `close`:
            await close_horse_race_betting(user, msg);
            break;

        case 'horse':
            {
                if (args.length < 2) {
                    msg.reply(`**usage**: ?hr <bet> <horse number>`);
                    return;
                }
                let bet = parse_bet(user, args[1], msg);
                let horseNum = parseInt(args[0]) - 1;
                if (isNaN(horseNum) || horseNum < 0) {
                    msg.reply(`Invalid horse number`);
                    msg.reply(`**usage**: ?hr <bet> <horse number>`);
                    return;
                }

                await process_horse_race_bet(user, horseNum, bet, msg);
            }
            break;

        case 'h':
        case 'help':
            display_help(msg);
            break;

        default:
            msg.reply(`Invalid command. Use **${prefix}help** to list available commands`);
            break;
    }
});

console.log(config.BOT_TOKEN);
client.login(config.BOT_TOKEN);
