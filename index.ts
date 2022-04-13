import * as Discord from 'discord.js';
const { Client } = Discord;
export const client: Discord.Client = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
import { Emoji, TextChannel } from 'discord.js';
import { readFileSync } from 'fs';
import * as fs from 'fs';
const config = JSON.parse(readFileSync('config.json').toString());

import { user_account, user_guild, user_state } from './src/user';
import { blackjack_game_continue, blackjack_game, blackjack_option } from './src/blackjack';
import { roulette_game, roulette_game_continue } from './src/russian_roulette';
import { dice_game } from './src/dice';
import { auto_slots, slots_game, stop_auto_slots } from './src/slots';
import { make_it_rain } from './src/rain';
import { cfg } from './src/bot_cfg';
import { dayInMili, hourInMili, minInMili } from './src/constants';
import { boneSymbol, cockEmojis, slotSymbols } from './src/symbols';
import { EMOJIS, GIFS } from './src/media';

const Axios = require('axios').default;

export const DEBUG_MODE: boolean = false;
export const DEBUG_TIMING: boolean = false;

import {
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
    load_nicknames,
    userDataJsonPath,
    delay,
    parse_stock_sell_share_count,
    approx_eq,
    money_str,
} from './src/utils';

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
} from './src/horse_racing';

import { daily_bones, start_working } from './src/misc';
import { get_stock_price } from './src/finnhub';
import { invest_in_stock, stock_position, update_user_stock_prices } from './src/stocks';

let botInitialized = false;

function get_random_string(length: number): string {
    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < length; i++) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

function get_log_date_string() {
    let today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const hh = String(today.getHours()).padStart(2, '0');
    const ss = String(today.getSeconds()).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${mm}-${dd}-${yyyy}-${hh}h-${mm}m-${ss}s`;
}

export function log_error(error: Error) {
    const dateString = get_log_date_string();
    let path = `logs/ERROR_${dateString}_${get_random_string(6)}.log`;
    fs.writeFileSync(path, `${error.stack}`);
}

function backup_user_data() {
    let file = fs.readFileSync(userDataJsonPath);
    const dateString = get_log_date_string();
    let path = `backups/user_data_${get_random_string(6)}_${dateString}.json`;
    fs.writeFileSync(path, file);
}

const globalTestChannelID = DEBUG_MODE ? '928704074306682880' : '963799010622193674';
let globalTestChannel: Discord.DMChannel = null;

process.on('uncaughtException', async function (err: Error) {
    if (globalTestChannel) {
        //globalTestChannel.send('I just died to a fatal error! Please tell sir_irk about this.').then((m) => console.log('\nsent\n'));
        await globalTestChannel.send('I just had an error! Please tell sir_irk about this.');
    } else {
        console.log('\nMain channel was null\n');
    }

    console.log(err);

    //backup_user_data();
    //log_error(err);
    //process.abort();
});

async function hourlyBackUp() {
    while (true) {
        await delay(1 * hourInMili);
        backup_user_data();
        console.log('Backup of user_data.json made');
    }
}

async function initialize() {
    await load_users();
    //await load_users().catch((e) => {
    //     console.log('failed to load users');
    //});
    console.log('finished loading users');
    load_nicknames(userGuilds);
    //hourlyBackUp();
    update_user_stock_prices(userGuilds);
    botInitialized = true;
}

initialize();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.channels.fetch(globalTestChannelID).then((c) => {
        globalTestChannel = c as Discord.DMChannel;
    });
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    if (DEBUG_MODE && msg.guildId !== `922243045787852890`) {
        return;
    } else if (!DEBUG_MODE && msg.guildId === `922243045787852890`) {
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
    } else if (!DEBUG_MODE && msg.guildId === `922243045787852890`) {
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

    //TODO: per guild configuration for this
    if (DEBUG_MODE) {
        if (!guild.slotsResultsChannel) {
            const testChannelId = '935303619098595368';
            const resultsChannel: Discord.DMChannel = (await client.channels.fetch(testChannelId)) as Discord.DMChannel;
            if (!resultsChannel) process.exit();
            user.guildObj.slotsResultsChannel = resultsChannel;
        }
    } else {
        if (!guild.slotsResultsChannel && guild.id === '741435551357337692') {
            const testChannelId = '935330410047623198';
            const resultsChannel: Discord.DMChannel = (await client.channels.fetch(testChannelId)) as Discord.DMChannel;
            if (!resultsChannel) process.exit();
            user.guildObj.slotsResultsChannel = resultsChannel;
        }
    }
    switch (command) {
        case 'squish':
            {
                if (user.id !== '150097140448886784') {
                    return;
                }

                const factor = 0.01;
                for (let i = 0; i < guild.users.length; ++i) {
                    const user = guild.users[i];
                    if (user.bones < 100000000) continue;
                    user.bones = Math.max(1000000, Math.floor(user.bones * factor));
                    for (let j = 0; j < user.stocks.length; ++j) {
                        const stock = user.stocks[j];
                        if (stock.numShares < 5) continue;
                        stock.numShares *= factor;
                    }
                }
                await msg.reply('Squished');
            }
            break;
        case 'togglegifsg':
        case 'tgg':
            {
                if (user.id !== '150097140448886784') {
                    return;
                }
                cfg.slotsGifsEnabled = !cfg.slotsGifsEnabled;
            }
            break;
        case 'togglegifs':
        case 'tg':
            {
                user.showGameGifs = !user.showGameGifs;
                await msg.reply(`Game GIFS have been turned ${user.showGameGifs ? '**on**' : '**off**'}\nThis only affects you.`);
            }
            break;
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
            if (Math.random() < 0.0) {
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
            if (user_is_playing_game(user, msg)) return;
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
                if (user_is_playing_game(user, msg)) return;

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
        case 'stop':
            {
                if (!user.autoSlots) {
                    msg.reply('You are not playing auto slots at the moment.');
                    break;
                }

                msg.channel.send(`${user.nickname}, Auto slots stopping...`);
                user.stoppingAutoSlots = true;
                //await stop_auto_slots(user, msg.channel as Discord.DMChannel);
            }
            break;
        case 'autoslots':
        case 'autosl':
            {
                msg.reply('Autoslots is currently disabled');
                return;

                if (args.length < 1) {
                    msg.reply(`Error: need a bet amount(note ${Math.floor(cfg.slotsAutoPlayPercentMax * 100)}% of your bones max)`);
                    return;
                }

                auto_slots(user, args[0], msg);
            }
            break;
        case 'slots':
        case 'sl':
            {
                /*
                if (user.id === '233860813662846976') {
                    msg.reply('You are temporarily banned from this game');
                    msg.delete();
                    return;
                }
      if (msg.guildId !== `922243045787852890`) {
          await msg.reply(`Sorry this game is down for maintenance... Be back
      soon`); return;
      }
      */
                if (user.autoSlots) {
                    msg.reply(`You cannot play slots while auto slots is running. Use **?stop** to end auto slots`);
                    return;
                }
                if (args.length < 1) {
                    msg.reply(`Error: need a bet amount`);
                    return;
                }

                let bet = parse_bet(user, args[0], msg);

                if (bet > 0) {
                    await slots_game(user, bet, msg.channel as Discord.DMChannel);
                    write_user_data_json(user);
                }
            }
            break;
        case 'roulette':
        case 'rl':
            {
                /*
                if (user.id === '233860813662846976') {
                    msg.reply('You are temporarily banned from this game');
                    msg.delete();
                    return;
                }
                */

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
                /*
                if (user.id === '233860813662846976') {
                    msg.reply('You are temporarily banned from this game');
                    msg.delete();
                    return;
                }
                if (msg.guildId !== `922243045787852890`) {
                    await msg.reply(`Sorry this game is down for maintenance... thank @meux`);
                    return;
                }
                */
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
            embed.addFields(
                { name: ':horse: Horse', value: `${boneSymbol} ${cfg.horseBasePrice.toLocaleString('en-US')}`, inline: true },
                { name: ':rooster: Cock', value: `${boneSymbol} ${cfg.cockBasePrice.toLocaleString('en-US')}`, inline: true }
            );
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
                switch (args[0].toLocaleLowerCase()) {
                    case 'horse':
                        await start_horse_purchase(user, msg);
                        return;
                    case 'cock':
                        msg.reply('Cumming soon');
                        break;
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
                const horse = find_horse(guild.horses, args.join(' '));

                if (horse) {
                    if (horse.ownerId === user.id) {
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
                let horses: race_horse[] = [];
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
                    let horses: race_horse[] = [];
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

        case 'hr':
        case 'race':
        case 'horserace':
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
                user.guildObj.horseRaceBetPool.entries.forEach((b) => {
                    b.user.state = user_state.none;
                });
                user.state = user_state.none;
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

        case 'cock':
            {
                const msgRef = await msg.reply('Fight!');
                await delay(1000);
                const p0emojis = cockEmojis.slice(0, 3);
                const p1emojis = cockEmojis.slice(3, 6);
                let str = `${EMOJIS.interestedSharkEmoji}   ${p0emojis[0]}          ${p1emojis[0]}`;

                await msgRef.edit(str);
                await delay(1000);
                str = `${EMOJIS.interestedSharkEmoji}    ${p0emojis[0]}     ${p1emojis[0]}`;
                await msgRef.edit(str);
                await delay(1000);
                str = `${EMOJIS.interestedSharkEmoji}     ${p0emojis[0]}   ${p1emojis[0]}`;
                await msgRef.edit(str);
                await delay(1000);
                str = `${EMOJIS.interestedSharkEmoji}       ${p0emojis[1]}${p1emojis[0]}`;
                await msgRef.edit(str);
                await delay(1000);
                str = `${EMOJIS.interestedSharkEmoji}       ${p0emojis[2]}${p1emojis[1]}`;
                await msgRef.edit(str);
                await delay(1000);
                str = `${EMOJIS.interestedSharkEmoji}          ${p1emojis[1]}`;
                await msgRef.edit(str);
                await delay(1000);
                await msg.reply('RIP');
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
                    .then(function (response: { data: { [x: string]: { games: any } } }) {
                        const allGames = response.data['api'].games;
                        if (allGames.length == 0) {
                            msg.reply('There are no live NBA games at the moment.');
                            return;
                        }

                        let games = allGames;
                        if (args.length > 0) {
                            games = allGames.filter(
                                (g: { hTeam: { shortName: string }; vTeam: { shortName: string } }) =>
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
                        games.forEach(
                            (g: {
                                hTeam: { score: { points: any }; shortName: any; fullName: any };
                                vTeam: { score: { points: any }; shortName: any; fullName: any };
                                currentPeriod: any;
                                clock: any;
                                arena: any;
                            }) => {
                                str = `${g.hTeam.score.points} : ${g.hTeam.shortName} (home)\n`;
                                str += `${g.vTeam.score.points} : ${g.vTeam.shortName} (away)\n`;
                                str += `Period: ${g.currentPeriod} | Clock: ${g.clock}\n`;
                                embed.addFields({
                                    name: `${g.hTeam.fullName} vs ${g.vTeam.fullName} @ ${g.arena}`,
                                    value: str,
                                    inline: false,
                                });
                            }
                        );
                        msg.reply({ embeds: [embed] });
                    })
                    .catch(function (error: any) {
                        console.error(error);
                    });
            }
            break;

        case 'stocks':
            {
                let embed = new Discord.MessageEmbed().setTitle(`:chart_with_upwards_trend: Stocks Help :chart_with_upwards_trend:`);

                const blk = '```';
                let tradeHelp = blk;

                tradeHelp += `${prefix}long <ticker symbol> <amount of money>\n\n`;
                tradeHelp += `- Stock Example  : ${prefix}long amc 10k\n`;
                tradeHelp += `- Crypto Example : ${prefix}long btc-usd all\n`;
                tradeHelp += `- aliases        : ${prefix}invest\n`;
                tradeHelp += `- Note : When going long you profit when the price goes up\n`;

                tradeHelp += `${blk}${blk}\n`;
                tradeHelp += `${prefix}short <ticker symbol> <amount of money>\n\n`;
                tradeHelp += `- Stock Example  : ${prefix}short amc 20%\n`;
                tradeHelp += `- Crypto Example : ${prefix}short btc-usd 10k\n`;
                tradeHelp += `- Note : When going short you profit when the price goes down\n`;

                tradeHelp += `${blk}${blk}\n`;
                tradeHelp += `${prefix}closeposition <ticker symbol> <number of shares>\n\n`;
                tradeHelp += `- Stock Example  : ${prefix}cp amc 10%\n`;
                tradeHelp += `- Crypto Example : ${prefix}cp btc-usd all\n`;
                tradeHelp += `- aliases        : ${prefix}cp\n`;
                tradeHelp += `- Note : use this for casshing out on long and short positions`;
                tradeHelp += `${blk}${blk}\n`;

                tradeHelp += `${prefix}ticker <ticker symbol>\n\n`;
                tradeHelp += `Look up price data on a ticker`;
                tradeHelp += `${blk}`;
                embed.addFields({ name: `How to Trade`, value: tradeHelp, inline: false });

                await msg.reply({ embeds: [embed] });
            }
            break;

        case 'long':
        case 'invest':
            {
                await invest_in_stock(user, args, false, msg);
            }
            break;
        case 'short':
            {
                await invest_in_stock(user, args, true, msg);
            }
            break;
        case 'closeposition':
        case 'closep':
        case 'cp':
            {
                if (user_is_playing_game(user, msg)) return;
                if (user.stocks.length == 0) {
                    await msg.reply(`You don't have any stocks. use ${prefix}invest to open a position.`);
                    return;
                }

                if (args.length < 2) {
                    await msg.reply(`Usage: ${prefix}sellstock <ticker symbol> <number of shares>`);
                    return;
                }

                const ticker = args[0].toUpperCase();
                const idx = user.stocks.findIndex((s) => {
                    return s.ticker === ticker;
                });
                const position = idx !== -1 ? user.stocks[idx] : null;
                if (position) {
                    const numberOfShares = parse_stock_sell_share_count(position, args[1], msg);
                    if (numberOfShares > 0) {
                        if (numberOfShares > position.numShares) {
                            await msg.reply(`You don't own that many shares in ${position.ticker}. You have ${position.numShares} shares`);
                            return;
                        }

                        let money = 0;
                        if (approx_eq(position.numShares, numberOfShares)) {
                            money = Math.floor(position.get_position_size());
                            user.add_money(money);
                            user.stocks.splice(idx, 1);
                        } else {
                            if (position.short) {
                                money = Math.floor(numberOfShares * (position.pricePerShare - position.get_price_difference()));
                            } else {
                                money = Math.floor(numberOfShares * position.pricePerShare);
                            }
                            user.add_money(money);
                            position.numShares -= numberOfShares;
                        }
                        await msg.reply(
                            `You ${position.short ? 'covered' : 'sold'} ${money_str(numberOfShares)} of ${position.ticker} @ ${money_str(
                                position.pricePerShare
                            )} for a total of ${money_str(money)}`
                        );
                        write_user_data_json(user);
                    }
                } else {
                    await msg.reply(`You don't own stock in ${ticker}`);
                }
            }
            break;

        case 'mystocks':
        case 'mycrypto':
            {
                if (user.stocks.length == 0) {
                    await msg.reply(`You don't have any stocks. use ${prefix}invest to open a position.`);
                    return;
                }

                let fullDisplay = false;
                if (args.length > 0) {
                    if (args[0].toLowerCase() === 'full') {
                        fullDisplay = true;
                    }
                }

                const timeStr = Math.round(cfg.userStockUpdateInterval / minInMili);
                let embed = new Discord.MessageEmbed().setTitle(
                    `:chart_with_upwards_trend: ${user.name}'s Positions :chart_with_upwards_trend: (Updated every ${timeStr} minutes)`
                );

                let profitSum = 0;
                let investmentSum = 0;
                const blk = '```';

                user.stocks.forEach((s: stock_position) => {
                    const profit = s.get_profit();
                    const profitPercent = s.get_profit_percentage();
                    const profitPercentStr = money_str(profitPercent);
                    const profitStr = money_str(profit);
                    const priceDiffStr = money_str(s.get_price_difference());
                    const type = s.short ? 'SHORT' : 'LONG';
                    const priceStr = money_str(s.averageCostPerShare);
                    const profitSymbol = profit >= 0 ? '+' : '-';
                    const curPriceStr = money_str(s.pricePerShare);

                    let str = '';
                    if (fullDisplay) {
                        str = `${blk}diff\n${profitSymbol}Profit    : ${profitStr} (${profitPercentStr}%)\n`;
                        str += `Value      : ${money_str(s.get_position_size())}\n`;
                        str += `Shares     : ${money_str(s.numShares)}\n`;
                        str += `Price Diff : ${priceDiffStr}\n`;
                        str += `Cur Price  : ${curPriceStr}\n`;
                    } else {
                        str = `${blk}diff\n${profitSymbol}Profit : ${boneSymbol}${profitStr} (${profitPercentStr}%) @ ${curPriceStr}\n`;
                    }
                    str += blk;
                    //const emoji = profit >= 0 ? `:chart_with_upwards_trend:` : `:chart_with_downwards_trend:`;
                    embed.addFields({ name: `${s.ticker} ${type} @ ${priceStr}`, value: str, inline: false });

                    profitSum += profit;
                    investmentSum += s.get_investment();
                });

                const profitPercent = (profitSum / investmentSum) * 100;
                const profitPercentStr = money_str(profitPercent);
                const profitStr = money_str(profitSum);
                const balance = investmentSum + profitSum;
                let str = `${blk}diff\n${profitSum >= 0 ? '+' : '-'}`;
                str += `Profit    : ${profitStr} (${profitPercentStr}%)\n`;
                str += `Investment : ${money_str(Math.floor(investmentSum))}\n`;
                str += `Balance    : ${money_str(Math.floor(balance))}\n`;
                str += blk;
                embed.addFields({ name: `Account Total`, value: str, inline: false });
                await msg.reply({ embeds: [embed] });
            }
            break;

        case 'ticker':
            {
                if (args.length < 1) {
                    await msg.reply(`Usage: ${prefix}ticker <symbol>`);
                    return;
                }
                const ticker = args[0].toUpperCase();
                const data = await get_stock_price(ticker);
                if (data.c && data.c > 0) {
                    let embed = new Discord.MessageEmbed().setTitle(`:chart_with_upwards_trend: ${ticker} :chart_with_upwards_trend:`);
                    embed.addFields(
                        { name: 'Current', value: `${data.c}`, inline: true },
                        { name: 'Change', value: `${data.d}%`, inline: true },
                        { name: 'Open', value: `${data.o}`, inline: true },
                        { name: 'High', value: `${data.h}`, inline: true },
                        { name: 'Low', value: `${data.l}`, inline: true },
                        { name: 'Prev Close', value: `${data.pc}`, inline: true }
                    );
                    await msg.reply({ embeds: [embed] });
                } else {
                    await msg.reply(`Failed to find stock or crypto "${args[0]}"`);
                }
            }
            break;

        default:
            msg.reply(`Invalid command. Use **${prefix}help** to list available commands`);
            break;
    }
});

console.log(config.BOT_TOKEN);
client.login(config.BOT_TOKEN);
