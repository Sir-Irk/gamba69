import Discord, { Emoji, TextChannel } from 'discord.js';
import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('config.json').toString());

import { user_account, user_guild, user_state } from './src/user.js';
import { blackjack_game_continue, blackjack_game, blackjack_option } from './src/blackjack.js';
import { roulette_game, roulette_game_continue } from './src/russian_roulette.js';
import { dice_game } from './src/dice.js';
import { slots_game } from './src/slots.js';
import { make_it_rain } from './src/rain.js';
import { cfg } from './src/bot_cfg.js';
import { dayInMili, hourInMili, minInMili } from './src/constants.js';
import { boneSymbol } from './src/symbols.js';
import { EMOJIS, GIFS } from './src/media.js';

const Axios = require('axios').default;

export const DEBUG_MODE = true;

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
    print_richest_list,
    display_user_stats,
    display_games,
    display_help,
    parse_bet,
    prefix,
    display_guild_stats,
    shuffle,
    get_id_from_tag,
} from './src/utils.js';

import {
    close_horse_race_betting,
    display_horse_stats,
    display_top_horses,
    display_placed_bets,
    horse_rank_option,
    list_horses,
    process_horse_race_bet,
    purchase_horse,
    race_horse,
    start_horse_purchase,
    start_horse_race,
    start_horse_race_bet_taking,
    find_horse,
    sell_horse,
    list_horse_graveyard,
    confirm_horse_sale,
    rename_horse,
    start_horse_renaming,
} from './src/horse_racing.js';

import { daily_bones, start_working } from './src/misc.js';

let botInitialized = false;

async function initialize() {
    await load_users();
    console.log('finished loading users');
    botInitialized = true;
}

initialize();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    if (DEBUG_MODE && msg.guildId !== `922243045787852890`) {
        return;
    }
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

    switch (user.state) {
        case user_state.buyingHorse:
            await purchase_horse(user, msg.content, msg);
            return;
        case user_state.renamingHorse:
            await rename_horse(user, user.horseBeingRenamed, msg.content, msg);
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
                if (user_is_playing_game(user, msg, false) && user.rl.counter > 0) {
                    user.state = user_state.none;
                    user.rl.counter = 0;
                    await msg.channel.send(`${user.nickname}, You have ended the game of roulette`);
                }
            }
            break;

        case 'yes':
        case 'y':
            {
                if (user.state === user_state.sellingHorse && user.horseToSell) {
                    await sell_horse(user, user.horseToSell, msg);
                }
            }
            break;
        case 'no':
        case 'n':
            {
                if (user.state === user_state.sellingHorse && user.horseToSell) {
                    user.state = user_state.none;
                    user.horseToSell = null;
                    msg.reply('You have cancelled the sale');
                }
            }
            break;
        case 'no':
        case 'n':

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
    if (DEBUG_MODE && msg.guildId !== `922243045787852890`) {
        return;
    }
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
    const args = body.split(/[\s,]+/);
    const command = args.shift().toLowerCase();

    let guild = get_guild(userGuilds, msg.guild.id);
    if (!guild) {
        guild = new user_guild(msg.guild.id);
        userGuilds.push(guild);
        console.log(`Adding guild: ${guild.id}`);
    }

    let user: user_account = get_user(guild.users, msg.author.id);
    if (!user) {
        const nickname = await get_nickname(msg.author.username, msg);
        user = new user_account(msg.author.username, msg.author.id, nickname, msg.guild.id, msg.guild.name, guild, 0);
        guild.users.push(user);
    }

    switch (command) {
        case 'write':
            {
                if (user.id !== '150097140448886784') {
                    return;
                }
                guild.users.forEach((u: user_account) => {
                    console.log(`Wrote user: ${u.name}`);
                    write_user_data_json(u);
                });
            }
            break;
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

            let idStr = get_id_from_tag(args[0]);
            if (idStr) {
                await give_user_bones(guild.users, user, idStr, bonesToGive, msg);
            } else {
                msg.reply('Invalid tag');
            }
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

        case `rename`:
            {
                if (args.length < 1) {
                    msg.reply(`**usage:** ?rename <horse>`);
                    return;
                }

                start_horse_renaming(user, guild.horses, args.join(), msg);
            }
            break;
        case `buy`:
            {
                if (args.length < 1) {
                    msg.reply(`**usage**: ?buy <item>`);
                    return;
                }
                if (args[0].toLocaleLowerCase() === 'horse') {
                    await start_horse_purchase(user, msg);
                    return;
                }
            }
            break;
        case `sell`:
            {
                /*
                if (user.id !== '150097140448886784') {
                    msg.reply(`Sorry that command is down for bug fixing. Try again later`);
                    return;
                }
                */
                if (args.length < 1) {
                    msg.reply(`**usage**: ?sell <horse name>`);
                    return;
                }
                const horse = find_horse(guild.horses, args.join());

                if (horse) {
                    if (horse.owner === user.name) {
                        await confirm_horse_sale(user, horse, msg);
                    } else {
                        await msg.reply(`Cannot sell. You do not own this horse.`);
                    }
                } else {
                    await msg.reply(`Failed to find horse`);
                }
            }
            break;

        case `horses`:
        case `horse`:
            {
                if (args.length < 1) {
                    await msg.reply(`**usage**: ?horse <name of horse>`);
                    return;
                }

                const horse = find_horse(guild.horses, args.join());
                if (horse) {
                    await display_horse_stats(horse, msg);
                } else {
                    await msg.reply(`Failed to find horse`);
                }
            }
            break;

        case `graveyard`:
        case `dead`:
            await list_horse_graveyard(user, msg);
            break;

        case 'racers':
        case 'show':
            if (user.guildObj.horseRaceIsTakingBets) {
                await list_horses(user, msg, true, user.guildObj.horsesInRace);
                await display_placed_bets(user.guildObj.horseRaceBetPool, msg);
            }
            break;

        case `mystable`:
        case `mystables`:
        case `ms`:
            {
                let horses = [];
                user.guildObj.horses.forEach((h: race_horse) => {
                    if (h.ownerId === user.id) {
                        horses.push(h);
                    }
                });
                if (horses.length > 0) {
                    await list_horses(user, msg, true, horses);
                } else {
                    msg.reply(`You don't have any horses`);
                }
            }
            break;

        case 'tophorse':
        case 'tophorses':
        case 'toph':
            {
                if (args.length < 1) {
                    await display_top_horses(user, msg);
                } else {
                    if (args[0].includes('win')) {
                        await display_top_horses(user, msg);
                    } else if (args[0].includes('rate')) {
                        await display_top_horses(user, msg, horse_rank_option.rate);
                    } else if (args[0].includes('place')) {
                        await display_top_horses(user, msg, horse_rank_option.place);
                    } else if (args[0].includes('speed')) {
                        await display_top_horses(user, msg, horse_rank_option.speed);
                    } else if (args[0].includes('earn')) {
                        await display_top_horses(user, msg, horse_rank_option.earned);
                    }
                }
            }
            break;

        case `stable`:
        case `stables`:
            {
                if (args.length > 0) {
                    msg.delete();
                    let horses = [];
                    const userId = get_id_from_tag(args[0]);

                    if (userId) {
                        user.guildObj.horses.forEach((h: race_horse) => {
                            if (h.ownerId === userId) horses.push(h);
                        });
                        if (horses.length == 0) {
                            msg.reply('Failed to find users stable');
                        } else {
                            await list_horses(user, msg, false, horses);
                        }
                    } else {
                        msg.reply('Invalid user tag');
                    }
                } else {
                    await list_horses(user, msg, false);
                }
            }
            break;

        case `stable2`:
        case `stables2`:
            {
                if (user.guildObj.horses.length < 25) {
                    msg.reply('There is no second stable. Not enough horses');
                    return;
                }
                let horses = [];
                for (let i = 25; i < user.guildObj.horses.length && i < 50; ++i) {
                    horses.push(user.guildObj.horses[i]);
                }
                await list_horses(user, msg, false, horses);
            }
            break;

        case `hr`:
        case `race`:
        case `horserace`:
            {
                if (args.length > 0) {
                    let horse = find_horse(guild.horses, args.join());
                    if (!horse) {
                        msg.reply('Failed to find horse');
                        return;
                    }
                    await start_horse_race_bet_taking(user, horse, msg);
                } else {
                    await start_horse_race_bet_taking(user, null, msg);
                }
            }
            break;

        case 'start':
        case 'close':
            await close_horse_race_betting(user, msg);
            break;
        case `cancel`:
            if (user.guildObj.horseRaceIsTakingBets && user === guild.userRunningHorseBet) {
                await msg.reply(`Horse betting has been cancelled`);
                user.guildObj.horseRaceIsTakingBets = false;
                user.guildObj.userRunningHorseBet = null;
            }
            break;

        case 'bet':
        case 'b':
            {
                if (!user.guildObj.horseRaceIsTakingBets) {
                    msg.reply(`There is no horse race to bet on. Use **?hr** to open betting`);
                    return;
                }
                if (args.length < 2) {
                    msg.reply(`**usage**: ?hr <bet> <horse number>`);
                    return;
                }
                let bet = parse_bet(user, args[1], msg);
                let horseNum = parseInt(args[0]) - 1;
                if (isNaN(horseNum) || horseNum < 0) {
                    //msg.reply(`Invalid horse number`);
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
        case 'nba':
            {
                const options = {
                    method: 'GET',
                    url: 'https://api-nba-v1.p.rapidapi.com/games/live/',
                    //url: 'https://api-nba-v1.p.rapidapi.com/games/date/2022-01-10',
                    headers: {
                        'x-rapidapi-host': 'api-nba-v1.p.rapidapi.com',
                        'x-rapidapi-key': 'b947104b99mshba2e2dff616eac6p1427f9jsn1f4036ad5d20',
                    },
                };

                Axios.request(options)
                    .then(function (response) {
                        const allGames = response.data['api'].games;
                        if (allGames.length == 0) {
                            msg.reply('There are no live NBA games at the moment.');
                            return;
                        }

                        let games = allGames;
                        if (args.length > 0) {
                            games = allGames.filter(
                                (g) =>
                                    g.hTeam.shortName.toLowerCase() === args[0].toLocaleLowerCase() ||
                                    g.vTeam.shortName.toLocaleLowerCase() === args[0].toLocaleLowerCase()
                            );

                            if (games.length === 0) {
                                msg.reply('Failed to find team');
                                return;
                            }
                        }

                        //console.log(response.data['api']);
                        let embed = new Discord.MessageEmbed().setTitle(':basketball: Live Games :basketball:');
                        let str = '';
                        games.forEach((g) => {
                            str = `${g.hTeam.score.points} : ${g.hTeam.shortName} (home)\n`;
                            str += `${g.vTeam.score.points} : ${g.vTeam.shortName} (away)\n`;
                            str += `Period: ${g.currentPeriod} | Clock: ${g.clock}\n`;
                            embed.addFields({ name: `${g.hTeam.fullName} vs ${g.vTeam.fullName} @ ${g.arena}`, value: str, inline: false });
                        });
                        msg.reply({ embeds: [embed] });
                    })
                    .catch(function (error) {
                        console.error(error);
                    });
            }
            break;

        default:
            msg.reply(`Invalid command. Use **${prefix}help** to list available commands`);
            break;
    }
});

console.log(config.BOT_TOKEN);
client.login(config.BOT_TOKEN);
