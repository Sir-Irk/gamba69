import fs from 'fs';
import Discord from 'discord.js';
const { Client } = Discord;

import { boneSymbol, slotSymbols } from './symbols.js';
import { slotPoints } from './slots.js';
import { GIFS, EMOJIS } from './media.js';
import { game_stats, user_account, user_guild } from './user.js';
import { Canvas, fillWithEmoji } from 'discord-emoji-canvas';
import { number } from 'zod';
import { average_record, race_horse } from './horse_racing.js';

export const userDataJsonPath = 'user_data.json';

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const client = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
export const prefix = '?';

export let userGuilds = [];

export enum game_category {
    blackjack,
    roulette,
    dice,
    slots,
    horseRacing,
    count,
}

export function add_money_to_user(user: user_account, amount: number) {
    user.bones += amount;
    user.highestBones = Math.max(user.bones, user.highestBones);
    user.guildObj.houseBones -= amount;
}

export function verify_bet(user: user_account, bet: number, msg: Discord.Message<boolean>): boolean {
    let str = `${user.nickname}, `;
    if (isNaN(bet) || bet == null || bet <= 0) {
        for (let i = 0; i < 10; ++i) {
            str += `$ { EMOJIS.doubtfulSharkEmoji }
      `;
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

export function user_is_playing_game(user: user_account, msg: Discord.Message<boolean>): boolean {
    if (user.isPlayingGame) {
        msg.reply(`${user.nickname}, You are already playing a game`);
        return true;
    }
    return false;
}

export function get_thousands_int(inStr: String) {
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

export function get_percentage_int(bones: number, inStr: string): number {
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

export function shuffle(array: any[]): any[] {
    let currentIndex = array.length;
    let randomIndex = 0;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function get_user_by_nickname(userAccounts: user_account[], nickname: string): user_account {
    if (!nickname) return null;

    for (let i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].nickname.toLowerCase() == nickname.toLowerCase()) {
            return userAccounts[i];
        }
    }
    return null;
}

export function get_user_by_name(userAccounts: user_account[], username: string): user_account {
    if (!username) return null;
    for (let i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].name.toLowerCase() == username.toLowerCase()) {
            return userAccounts[i];
        }
    }
    return null;
}

export function get_user(userAccounts, id) {
    for (let i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].id == id) {
            return userAccounts[i];
        }
    }
    return null;
}

export function get_guild(guilds, id) {
    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id == id) {
            return guilds[i];
        }
    }
    return null;
}

export async function get_nickname(username: string, msg: Discord.Message): Promise<string> {
    let nickname = username;
    let guildObj = await client.guilds.fetch(msg.guild.id);
    if (guildObj) {
        let user = await guildObj.members.fetch(msg.author.id);
        if (user) {
            if (user.nickname) {
                nickname = user.nickname;
            }
        }
    }
    return nickname;
}

export async function give_user_bones(
    users: user_account[],
    gifter: user_account,
    receiverName: string,
    amount: number,
    msg: Discord.Message<boolean>
): Promise<void> {
    if (gifter.bones < amount) {
        msg.reply(
            `${gifter.name}, you don't have enough bones to give that much. you have **${gifter.bones.toLocaleString(
                'en-US'
            )}** ${boneSymbol}`
        );
        return;
    }

    let receiver: user_account = get_user(users, receiverName);
    if (!receiver) {
        receiver = get_user_by_name(users, receiverName);
        if (!receiver) {
            receiver = get_user_by_nickname(users, receiverName);
            if (!receiver) {
                msg.reply(`${gifter.name}, Failed to give bones.User not found.`);
                return;
            }
        }
    }

    if (receiver.id == gifter.id) {
        msg.reply(`You can't give yourself bones, you dangus`);
        return;
    }
    receiver.bones += amount;
    gifter.bones -= amount;
    write_user_data_json(gifter);
    write_user_data_json(receiver);
    msg.reply(`${receiver.name}, ${gifter.name} just gave you **${amount.toLocaleString('en-US')}** ${boneSymbol}`);
}

export async function print_richest_list(users: user_account[], msg: Discord.Message): Promise<void> {
    users.sort(function (usr0, usr1) {
        const a = usr0.bones;
        const b = usr1.bones;
        return a < b ? 1 : a > b ? -1 : 0;
    });
    let leaderboard = '';

    let sum = 0;
    for (let i = 0; i < users.length; ++i) {
        sum += users[i].bones;
    }

    let names = [];
    let scores = [];

    for (let i = 0; i < users.length && i < 10; i++) {
        const usr = users[i];
        if (i == 0) {
            names.push(`:first_place: ${usr.nickname}`);
        } else if (i == 1) {
            names.push(`:second_place: ${usr.nickname} `);
        } else if (i == 2) {
            names.push(`:third_place: ${usr.nickname}`);
        } else {
            names.push(`**${i + 1}th** ${usr.nickname}`);
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
export function write_user_data_json(user: user_account): void {
    while (isWritingJSONfile) {}
    isWritingJSONfile = true;
    let file = fs.readFileSync(userDataJsonPath);
    let json = JSON.parse(file.toString());
    const id = user.id;
    const guild = user.guild;
    const guildObj = user.guildObj;
    if (!json[guild]) {
        json[guild] = {
            guild_name: user.guildName,
            houseBones: guildObj.houseBones,
        };
    }

    json[guild].horses = guildObj.horses;

    json[guild][id] = {
        username: user.name,
        bones: user.bones,
        dailyCollectionTime: user.dailyCollectionTime,
        dailyStreak: user.dailyStreak,
        workStartTime: user.workStartTime,
        workPaycheck: user.workPaycheck,
        charityCollectionTime: user.charityCollectionTime,
        highestBones: user.highestBones,
        gameStats: user.gameStats,
        numHorsesOwned: user.numHorsesOwned,
    };
    fs.writeFileSync(userDataJsonPath, JSON.stringify(json, null, 2));
    isWritingJSONfile = false;
}

export async function load_users(): Promise<void> {
    let str = new String(userDataJsonPath);
    let file = fs.readFileSync(userDataJsonPath);
    let json = JSON.parse(file.toString());

    for (const guildKey in json) {
        //if (guildKey !== `922243045787852890`) continue;
        let guild = new user_guild(guildKey);

        const g = json[guildKey];
        let guildObj = await client.guilds.fetch(guildKey);
        guild.name = g.guild_name;

        guild.houseBones = g.houseBones;
        for (const horseKey in json[guildKey]['horses']) {
            const u = json[guildKey]['horses'][horseKey];
            //if (u.placementAverage !== undefined) {
            let horse = new race_horse(u.name, 0);
            horse.wins = u.wins;
            horse.races = u.races;

            horse.placementAverage.count = u.placementAverage.count;
            horse.placementAverage.sum = u.placementAverage.sum;
            horse.speedAverage.count = u.speedAverage.count;
            horse.speedAverage.sum = u.speedAverage.sum;
            horse.age = u.age;
            horse.owner = u.owner;
            horse.speed = u.speed;
            guild.horses.push(horse);
        }

        userGuilds.push(guild);

        let guildName = '';
        for (const userKey in json[guildKey]) {
            const u = json[guildKey][userKey];
            if (u.bones == null || u.bones == undefined) {
                if (u.guild_name !== undefined) guildName = u.guild_name;
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

            for (let i = 0; i < game_category.count; ++i) {
                user.gameStats.push(new game_stats(i as game_category));
            }
            user.workStartTime = u.workStartTime;
            user.workPaycheck = u.workPaycheck;
            user.dailyStreak = u.dailyStreak;
            user.charityCollectionTime = u.charityCollectionTime;
            user.highestBones = u.highestBones;
            if (u.numHorsesOwned != undefined) user.numHorsesOwned = u.numHorsesOwned;

            user.gameStats = u.gameStats as game_stats[];
            guild.users.push(user);
            console.log(`Loaded user: ${u.username} for guild ${json[guildKey].guild_name}`);
        }
    }
}

class game_stat_display {
    played: number;
    moneySum: number;
    wins: number;
    winPercent: number;
    name: string;

    constructor(name: string) {
        this.played = 0;
        this.moneySum = 0;
        this.wins = 0;
        this.winPercent = 0;
        this.name = name;
    }
}

export async function display_guild_stats(guild: user_guild, msg: Discord.Message<boolean>): Promise<void> {
    let totalGamesPlayed = 0;
    let winSum = 0;
    let stats: game_stat_display[] = [];
    stats.push(new game_stat_display(`:black_joker:  Blackjack  :black_joker:`));
    stats.push(new game_stat_display(`:gun:  Roulette  :gun:`));
    stats.push(new game_stat_display(`:game_die:  Dice  :game_die:`));
    stats.push(new game_stat_display(`:slot_machine:  Slots  :slot_machine:`));
    stats.push(new game_stat_display(`:horse_racing:  Racing  :horse_racing:`));

    guild.users.forEach((e: user_account) => {
        e.gameStats.forEach((s: game_stats) => {
            totalGamesPlayed += s.played;
            winSum += s.wins;
            stats[s.type].played += s.played;
            stats[s.type].wins += s.wins;
            stats[s.type].moneySum += s.moneyWon;
        });
    });

    let totalWinPercent = totalGamesPlayed > 0 ? Math.round((winSum / totalGamesPlayed) * 100) : 0;

    let totalBoneSum = 0;
    stats.forEach((s: game_stat_display) => {
        totalBoneSum += s.moneySum;
    });

    const embed = new Discord.MessageEmbed()
        .setTitle(`${boneSymbol} ${guild.name}: Stats For All Tight Little Asses ${boneSymbol}`)
        .setColor('#229090');

    let str = `**Games:** ${totalGamesPlayed.toLocaleString('en-US')}\n`;
    str += `**Wins:** ${winSum.toLocaleString('en-US')} (${totalWinPercent}%)\n`;
    str += `**Profit:** ${totalBoneSum.toLocaleString('en-US')}`;
    embed.addFields({ name: `:video_game: All Games :video_game:`, value: str, inline: true });

    stats.forEach((s: game_stat_display) => {
        s.winPercent = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
        str = `**Games:** ${s.played.toLocaleString('en-US')}\n`;
        str += `**Wins:** ${s.wins.toLocaleString('en-US')} (${s.winPercent}%)\n`;
        str += `**Profit:** ${s.moneySum.toLocaleString('en-US')}`;
        embed.addFields({ name: s.name, value: str, inline: true });
    });

    embed.addFields({ name: `Extra:`, value: `Stats recorded since 1/4/22`, inline: false });

    await msg.reply({ embeds: [embed] });
}

export async function display_user_stats(user: user_account, msg: Discord.Message) {
    let totalGamesPlayed = 0;
    let winSum = 0;
    let totalBoneSum = 0;

    let stats: game_stat_display[] = [];
    stats.push(new game_stat_display(`:black_joker:  Blackjack  :black_joker:`));
    stats.push(new game_stat_display(`:gun:  Roulette  :gun:`));
    stats.push(new game_stat_display(`:game_die:  Dice  :game_die:`));
    stats.push(new game_stat_display(`:slot_machine:  Slots  :slot_machine:`));
    stats.push(new game_stat_display(`:horse_racing:  Racing  :horse_racing:`));

    user.gameStats.forEach((s: game_stats) => {
        totalGamesPlayed += s.played;
        winSum += s.wins;
        totalBoneSum += s.moneyWon;
        stats[s.type].played += s.played;
        stats[s.type].wins += s.wins;
        stats[s.type].moneySum += s.moneyWon;
        stats[s.type].winPercent = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
    });

    let totalWinPercent = totalGamesPlayed > 0 ? Math.round((winSum / totalGamesPlayed) * 100) : 0;
    const embed = new Discord.MessageEmbed().setTitle(`${boneSymbol} ${user.nickname}'s Stats ${boneSymbol}`).setColor('#9033AA');

    let str = `**Games:** ${totalGamesPlayed.toLocaleString('en-US')}\n`;
    str += `**Wins:** ${winSum.toLocaleString('en-US')} (${totalWinPercent}%)\n`;
    str += `**Profit:** ${totalBoneSum.toLocaleString('en-US')}`;
    embed.addFields({ name: `:video_game: All Games :video_game:`, value: str, inline: true });

    stats.forEach((s: game_stat_display) => {
        str = `**Games:** ${s.played.toLocaleString('en-US')}\n`;
        str += `**Wins:** ${s.wins.toLocaleString('en-US')} (${s.winPercent}%)\n`;
        str += `**Profit:** ${s.moneySum.toLocaleString('en-US')}`;
        embed.addFields({ name: s.name, value: str, inline: true });
    });

    embed.addFields({ name: `Extra:`, value: `Stats recorded since 1/4/22`, inline: false });

    await msg.reply({ embeds: [embed] });
}

export async function display_games(msg: Discord.Message<boolean>): Promise<void> {
    const embed = new Discord.MessageEmbed()
        .setTitle('Games')
        .setColor('#008800')
        .addFields(
            {
                name: `${prefix}dice <bet>`,
                value: `Roll the dice and hope for the best`,
                inline: false,
            },
            {
                name: `${prefix} roulette<bet> or ${prefix} rl<bet>`,
                value: `Russian Roulette.Risk your life if you have the balls`,
                inline: false,
            },
            {
                name: `${prefix} blackjack<bet> or ${prefix} bl<bet>`,
                value: `Good old Blackjack`,
                inline: false,
            }
        );

    let str = '\n';
    for (let y = 0; y < slotSymbols.length; ++y) {
        for (let x = 0; x < slotSymbols[y].length; ++x) {
            str += `${slotSymbols[y][x]} = ${slotPoints[x]} x, `;
        }
        str += '\n';
    }
    embed.addFields({
        name: `${prefix} slots<bet> or ${prefix} sl<bet>`,
        value: str,
        inline: false,
    });
    embed.addFields({
        name: `Tips`,
        value: `you can type "all" for your bet to bet all of your bones\n\nYou can do shorthand versions of in-game commands\nh = hit, s = stand, c = continue, e = end`,
        inline: false,
    });

    await msg.reply({ embeds: [embed] });
}

export async function display_help(msg: Discord.Message<boolean>): Promise<void> {
    const embed = new Discord.MessageEmbed()
        .setTitle('Commands')
        .setColor('#C69B6D')
        .addFields(
            {
                name: `${prefix} daily`,
                value: 'Get your daily bonus. Consecutive days give a bonus',
                inline: false,
            },
            {
                name: `${prefix} work`,
                value: 'Make yourself useful. Earn a paycheck after a duration',
                inline: false,
            },
            {
                name: `${prefix} games`,
                value: 'Lists games you can play',
                inline: false,
            },
            {
                name: `${prefix} bones`,
                value: 'Display your bone balance',
                inline: false,
            },
            {
                name: `${prefix} richest`,
                value: 'Display the top 10 richest users on the server',
                inline: false,
            },
            {
                name: `${prefix} give<user> <amount>`,
                value: 'Give your bones to another user',
                inline: false,
            },
            {
                name: `${prefix} rain<amount> <number of users>(optional)`,
                value: 'Make it rain on random people in the server. "Amount" is divided amongst everyone unless you specify a number of users',
                inline: false,
            },
            {
                name: `${prefix} stats`,
                value: 'Display your stats for casino games',
                inline: false,
            },
            {
                name: `${prefix} charity`,
                value: 'For the less fortunate. Receive a small donation if you are broke',
                inline: false,
            },
            {
                name: `${prefix} house`,
                value: 'Show how many bones I the house(aka Kevin) has',
                inline: false,
            },
            {
                name: `${prefix} kys`,
                value: "Tells me to kill myself... I'll do it too",
                inline: false,
            }
        );

    await msg.reply({ embeds: [embed] });
}

export function parse_bet(user: user_account, arg: any, msg: Discord.Message): number {
    let bet = get_percentage_int(user.bones, arg);
    if (bet == 0) bet = get_thousands_int(arg);

    if (bet == 0) {
        const parsedArg = parseInt(arg);
        bet = arg.toLowerCase() == 'all' ? user.bones : parsedArg;
        if (isNaN(bet)) {
            bet = 0;
        }
    }

    if (bet <= 0) {
        msg.reply(`Error : Invalid amount of bones`);
        return 0;
    }

    return bet;
}

export class graphics {
    blackjackBackground = Canvas.loadImage('./images/green_felt.jpg');
    slotsBackground = Canvas.loadImage('./images/slots_test.png');
    youBustedTestImage = Canvas.loadImage('./images/you_busted_test.png');
}

export async function load_graphics() {
    const graphicsObj = new graphics();
    return graphicsObj;
}

export let graphicsObj = new graphics();
function resolve(resolve: any, ms: Promise<any>) {
    throw new Error('Function not implemented.');
}