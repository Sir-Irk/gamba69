import { user_account, user_guild, user_state } from './user.js';
import { delay, game_category, shuffle, user_is_playing_game, verify_bet } from './utils.js';
import { EMOJIS, GIFS } from './media.js';
import { boneSymbol } from './symbols.js';
import Discord from 'discord.js';
import { cfg } from './bot_cfg.js';
import { write_user_data_json } from './utils.js';

class bet_pool_entry {
    user: user_account;
    horse: race_horse;
    bet: number;
    constructor(user: user_account, horse: race_horse, bet: number) {
        this.user = user;
        this.bet = bet;
        this.horse = horse;
    }
}

export class bet_pool {
    entries: bet_pool_entry[];
    constructor() {
        this.entries = [];
    }

    public get_horse_bets(horse: race_horse): number {
        let sum = 0;
        for (let i = 0; i < this.entries.length; ++i) {
            if (this.entries[i].horse === horse) {
                sum += this.entries[i].bet;
            }
        }
        return sum;
    }
}

export class average_record {
    count: number = 0;
    sum: number = 0;
    public add(n: number): void {
        this.sum += n;
        this.count++;
    }
    public get_average(): number {
        return this.sum > 0 ? this.sum / this.count : 0;
    }
}

export function find_horse(horses: race_horse[], name: string) {
    for (let i = 0; i < horses.length; ++i) {
        const h: race_horse = horses[i];
        if (h.name.toLowerCase() === name) {
            return h;
        }
    }
    for (let i = 0; i < horses.length; ++i) {
        const h = horses[i];
        if (h.name.toLowerCase().includes(name)) {
            return h;
        }
    }

    return null;
}

export class race_horse {
    trackPos: number;
    name: string;
    age: number;
    owner: string;
    ownerId: string;
    handle: number;
    commissionEarned: number;
    commissionPayments: number;
    dateOfDeath: string;

    wins: number;
    races: number;

    placementAverage: average_record;
    speedAverage: average_record;

    speed: number;

    constructor(name: string, trackPos: number, age: number = 0) {
        this.name = name;
        this.trackPos = trackPos;
        this.speed = 0.97 + Math.random() * 0.06;
        this.age = age == 0 ? 1 + Math.random() * 40 : age;
        this.wins = 0;
        this.races = 0;
        this.placementAverage = new average_record();
        this.speedAverage = new average_record();
        this.commissionEarned = 0;
        this.commissionPayments = 0;
        this.ownerId = null;
        this.dateOfDeath = 'N/A';
    }
}

function all_horses_finished(horses: race_horse[]): boolean {
    for (let i = 0; i < horses.length; ++i) {
        if (horses[i].trackPos > 0) {
            return false;
        }
    }
    return true;
}

function make_track_string(
    horses: race_horse[],
    trackLen: number,
    message: string = '',
    fireGun: boolean = false,
    showGun: boolean = true
) {
    let names = [];
    for (let i = 0; i < horses.length; ++i) {
        const charLim = 32;
        if (horses[i].name.length > charLim && !horses[i].name.includes(`<:`)) {
            names.push(`${horses[i].name.slice(0, charLim)}...`);
        } else {
            names.push(horses[i].name);
        }
    }
    console.assert(names.length == horses.length);

    let str = `:checkered_flag:`;
    for (let i = 0; i < trackLen * 1.58; ++i) {
        str += ' ';
    }
    if (fireGun) {
        str += `:boom: :gun: ${EMOJIS.whySharkEmoji} ${message}\n`;
    } else {
        let gun = showGun ? `:gun:` : '    ';
        let kevin = showGun ? `${EMOJIS.doubtfulSharkEmoji}` : `${EMOJIS.interestedSharkEmoji}`;
        str += `    ${gun} ${kevin} ${message}\n`;
    }
    for (let h = 0; h < horses.length; ++h) {
        str += `:checkered_flag: `;
        for (let i = 0; i < trackLen; ++i) {
            if (i == Math.min(horses[h].trackPos, trackLen - 1)) {
                str += ` :horse_racing: `;
            } else {
                str += `-`;
            }
        }
        str += ` | ${names[h]}\n`;
    }
    return str;
}

export async function confirm_horse_sale(user: user_account, horse: race_horse, msg: Discord.Message) {
    await msg.reply(`You are about to sell ${horse.name}. Are you sure?(y/n)`);
    user.state = user_state.sellingHorse;
    user.horseToSell = horse;
    return;
}

export async function rename_horse(user: user_account, horse: race_horse, newName: string, msg: Discord.Message) {
    if (newName.length > cfg.maxHorseNameLength) {
        await msg.reply(`Name too long. Max characters: ${cfg.maxHorseNameLength}`);
        return;
    }

    msg.reply(`You have renamed ${horse.name} to ${newName}`);
    horse.name = newName;
    user.horseBeingRenamed = null;
    user.state = user_state.none;
}

export async function start_horse_renaming(user: user_account, horses: race_horse[], name: string, msg: Discord.Message) {
    let horse = find_horse(horses, name);
    const guild = user.guildObj;
    if (!horse) {
        await msg.reply('Failed to find horse. **Usage:** ?rename <horse name> <new name>');
        return;
    }

    const owner = guild.horseOwners[horse.handle];
    if (!owner || owner.id !== horse.ownerId) {
        await msg.reply('You can only rename a horse you own');
        return;
    }

    if (horse.races > 0) {
        await msg.reply('You can only rename a horse if they have never raced');
        return;
    }

    user.state = user_state.renamingHorse;
    user.horseBeingRenamed = horse;

    await msg.reply(`Enter a new name for ${horse.name}:`);
}

export async function sell_horse(user: user_account, horse: race_horse, msg: Discord.Message) {
    while (user.guildObj.horseBeingSold) {}
    user.guildObj.horseBeingSold = true;

    const sellPrice = Math.round(cfg.horseBasePrice * 0.5);
    user.add_money(sellPrice);
    if (horse.races > 0) {
        user.guildObj.horseGraveyard.push(horse);
    }
    user.numHorsesOwned--;
    msg.reply(`You have sold ${horse.name} to the glue factory for **${sellPrice.toLocaleString('en-US')}** ${boneSymbol}`);

    let today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    horse.dateOfDeath = `${mm}/${dd}/${yyyy}`;

    let guild = user.guildObj;

    user.guildObj.horses = user.guildObj.horses.filter((h) => h.name !== horse.name);

    update_horse_handles(user.guildObj);

    user.state = user_state.none;
    write_user_data_json(user);
    user.guildObj.horseBeingSold = false;
}

export async function start_horse_purchase(user: user_account, msg: Discord.Message) {
    if (user.state === user_state.buyingHorse) return;
    if (user.bones < cfg.horseBasePrice) {
        msg.reply(`${user.nickname}, you do not have enough bones to purchase a horse`);
        return;
    }

    if (user.numHorsesOwned >= cfg.maxHorsesPerUser) {
        msg.reply(`Sorry but you already own the maximum number of horses: ${cfg.maxHorsesPerUser}`);
        return;
    }
    user.state = user_state.buyingHorse;
    msg.reply(`You are about to buy a horse! Please enter a name for it now :horse:`);
}

export function update_horse_handles(guild: user_guild) {
    guild.horseOwners = [];
    let horses = guild.horses;

    for (let i = 0; i < horses.length; ++i) {
        horses[i].handle = i;

        if (!horses[i].ownerId) {
            guild.horseOwners.push(null);
            continue;
        }

        for (let j = 0; j < guild.users.length; ++j) {
            const u = guild.users[j];
            if (u.id === horses[i].ownerId) {
                guild.horseOwners.push(u);
                break;
            }
        }
    }

    console.assert(horses.length === guild.horseOwners.length, `HORSE COUNT(${horses.length}) DOESN'T MATCH OWNER COUNT`);
}

export async function purchase_horse(user: user_account, horseName: string, msg: Discord.Message) {
    if (horseName.length > cfg.maxHorseNameLength) {
        msg.reply(`That name is too long. ${cfg.maxHorseNameLength} characters max`);
        return;
    }
    let horse = new race_horse(horseName, 0, 1 + Math.random() * 5);
    horse.owner = user.name;
    horse.ownerId = user.id;
    let horses = user.guildObj.horses;
    for (let i = 0; i < horses.length; ++i) {
        if (horses[i].name === horseName) {
            msg.reply('That horse name already exists. Try purchasing again with a diffrent name');
            return;
        }
    }
    horses.push(horse);
    update_horse_handles(user.guildObj);
    msg.reply(`Congrats! You bought your new horse ${horseName}! It walks out of the stable and approaches you...`);
    write_user_data_json(user);
    user.state = user_state.none;
    user.add_money(-cfg.horseBasePrice);
    user.numHorsesOwned++;
    await delay(3000);
    let msgRef = await msg.reply(`${EMOJIS.sihEmoji}`);
    let str = '';
    for (let spaces = 12; spaces > 2; --spaces) {
        str = `${EMOJIS.sihEmoji}`;
        for (let i = 0; i < spaces; ++i) {
            str += '  ';
        }
        str += ':horse:';
        await delay(1000);
        await msgRef.edit(str);
    }
    await delay(1000);
    str = `${EMOJIS.sihEmoji} :heart: :horse:`;
    await msgRef.edit(str);
}

export enum horse_rank_option {
    wins,
    rate,
    place,
    speed,
    earned,
}
export async function display_top_horses(user: user_account, msg: Discord.Message, rankOption: horse_rank_option = horse_rank_option.wins) {
    let embed = new Discord.MessageEmbed().setColor('#BB2222');

    const horses = [...user.guildObj.horses];
    switch (rankOption) {
        case horse_rank_option.wins:
            embed.setTitle(`:horse_racing: Top 10 Horses: Wins :horse_racing:`);
            horses.sort((a: race_horse, b: race_horse) => {
                return b.wins - a.wins;
            });
            break;
        case horse_rank_option.rate:
            embed.setTitle(`:horse_racing: Top 10 Horses: Win Rate :horse_racing:`);
            horses.sort((a: race_horse, b: race_horse) => {
                let pA = a.races > 0 ? a.wins / a.races : 0;
                let pB = b.races > 0 ? b.wins / b.races : 0;
                return pB - pA;
            });
            break;
        case horse_rank_option.place:
            embed.setTitle(`:horse_racing: Top 10 Horses: Average Placement :horse_racing:`);
            horses.sort((a: race_horse, b: race_horse) => {
                let pA = a.placementAverage.get_average();
                let pB = b.placementAverage.get_average();
                if (pA < 1) pA = 100;
                if (pB < 1) pB = 100;
                return pA - pB;
            });
            break;
        case horse_rank_option.speed:
            embed.setTitle(`:horse_racing: Top 10 Horses: Average Speed :horse_racing:`);
            horses.sort((a: race_horse, b: race_horse) => {
                let pA = a.speedAverage.get_average();
                let pB = b.speedAverage.get_average();
                return pB - pA;
            });
            break;
        case horse_rank_option.earned:
            embed.setTitle(`:horse_racing: Top 10 Horses: Commission Earnings :horse_racing:`);
            horses.sort((a: race_horse, b: race_horse) => {
                let pA = a.commissionEarned;
                let pB = b.commissionEarned;
                return pB - pA;
            });
            break;
    }

    let name = '';
    for (let i = 0; i < 10 && i < horses.length; ++i) {
        const h = horses[i];
        let winP = h.races > 0 ? h.wins / h.races : 0;
        if (i === 0) {
            name = `:first_place: :racehorse: ${h.name}`;
        } else if (i == 1) {
            name = `:second_place: :racehorse: ${h.name}`;
        } else if (i == 2) {
            name = `:third_place: :racehorse: ${h.name}`;
        } else {
            name = `**${i + 1}th** :racehorse: ${h.name}`;
        }

        let recordStr = '';
        if (rankOption === horse_rank_option.earned) {
            recordStr = `Earned: ${boneSymbol} ${h.commissionEarned.toLocaleString('en-US')} \n`;
            recordStr += `Payments: ${h.commissionPayments}\n`;
            recordStr += h.owner ? `Owner: ${h.owner}\n` : `Owner: Kevin\n`;
        } else {
            const percentage = h.races > 0 ? Math.round((h.wins / h.races) * 100) : 0;
            recordStr = `${h.wins} / ${h.races - h.wins} / ${h.races} (${percentage}%)\n`;
            recordStr += `Avg place: ${h.placementAverage.get_average().toLocaleString('en-US')} | `;
            recordStr += `Avg Speed: ${(h.speedAverage.get_average() * 12).toLocaleString('en-US')} mph\n`;
        }

        embed.addFields({ name: name, value: recordStr, inline: false });
    }

    await msg.reply({ embeds: [embed] });
}

export async function display_horse_stats(horse: race_horse, msg: Discord.Message) {
    let embed = new Discord.MessageEmbed().setTitle(`:horse: ${horse.name}'s Stats :horse:`).setColor('#BB2222');

    let winPercentStr = horse.races > 0 ? (horse.wins / horse.races) * 100 : 0;
    let str = '';
    str += `${horse.wins}/${(horse.races - horse.wins).toLocaleString('en-US')} (${winPercentStr.toLocaleString('en-US')}%)\n`;
    str += `Races: ${horse.races.toLocaleString('en-US')}\n`;
    embed.addFields({ name: `:checkered_flag: Win/Loss :checkered_flag:`, value: str, inline: true });

    str = '';
    str += `Avg Place: ${horse.placementAverage.get_average().toLocaleString('en-US')}\n`;
    str += `Avg Speed: ${Math.floor(horse.speedAverage.get_average() * 12).toLocaleString('en-US')} mph\n`;
    embed.addFields({ name: `:chart_with_upwards_trend: Performance :chart_with_upwards_trend:`, value: str, inline: true });

    str = `Age: ${Math.floor(horse.age)}\n`;
    embed.addFields({ name: `:medical_symbol: Health :medical_symbol:`, value: str, inline: true });

    str = `Earned: ${horse.commissionEarned.toLocaleString('en-US')}\n`;
    str += `Payments: ${horse.commissionPayments}\n`;
    embed.addFields({ name: `${boneSymbol} Commission ${boneSymbol}`, value: str, inline: true });

    str = horse.owner ? `${horse.owner}` : 'Kevin';
    embed.addFields({ name: `:farmer: Owner :woman_farmer:`, value: str, inline: true });
    await msg.reply({ embeds: [embed] });
}

export async function list_horse_graveyard(user: user_account, msg: Discord.Message) {
    const horses = user.guildObj.horseGraveyard;

    let embed = new Discord.MessageEmbed().setTitle(`:headstone: The Horse Graveyard :headstone:`).setColor('#000000');

    let i = 0;
    horses.forEach((h: race_horse) => {
        let percent = h.races > 0 ? Math.floor((h.wins / h.races) * 100) : 0;
        let str = `Rec: ${h.wins.toLocaleString('en-US')}/${h.races.toLocaleString('en-US')} (${percent}%)\n`;
        str += `Avg Placement: ${h.placementAverage.get_average().toLocaleString('en-US')}\n`;
        str += `Avg Speed: ${Math.floor(h.speedAverage.get_average() * 10).toLocaleString('en-US')} mph\n`;
        str += `Earned: ${boneSymbol} ${h.commissionEarned.toLocaleString('en-US')}\n`;
        str += `Age: ${Math.floor(h.age)} years\n`;
        str += `Owner: `;
        str += h.owner ? `${h.owner}\n` : 'Kevin\n';
        str += `Date of death: ${h.dateOfDeath}\n`;
        embed.addFields({ name: `${i + 1}. :racehorse: ${h.name}`, value: str, inline: true });
        ++i;
    });

    await msg.reply({ embeds: [embed] });
}

export async function list_horses(user: user_account, msg: Discord.Message, showAllInfo: boolean = false, horses: race_horse[] = null) {
    if (!horses) {
        horses = user.guildObj.horses;
    }

    let embed = new Discord.MessageEmbed().setTitle(`:horse: :farmer:  The Stables :woman_farmer: :horse:`).setColor('#BB2222');

    let i = 0;
    horses.forEach((h: race_horse) => {
        let percent = h.races > 0 ? Math.floor((h.wins / h.races) * 100) : 0;
        let str = `Rec: ${h.wins.toLocaleString('en-US')}/${h.races.toLocaleString('en-US')} (${percent}%)\n`;

        if (showAllInfo) {
            str += `Avg Placement: ${h.placementAverage.get_average().toLocaleString('en-US')}\n`;
            str += `Avg Speed: ${Math.floor(h.speedAverage.get_average() * 10).toLocaleString('en-US')} mph\n`;
            str += `Earned: ${boneSymbol} ${h.commissionEarned.toLocaleString('en-US')}\n`;
        }
        str += `Age: ${Math.floor(h.age)} years\n`;
        str += `Owner: `;
        str += h.owner ? `${h.owner}` : 'Kevin';
        embed.addFields({ name: `${i + 1}. :racehorse: ${h.name}`, value: str, inline: true });
        ++i;
    });

    await msg.reply({ embeds: [embed] });
}

export async function close_horse_race_betting(user: user_account, msg: Discord.Message): Promise<void> {
    if (user.guildObj.horseRaceIsActive) return;
    if (!user.guildObj.userRunningHorseBet || !user.guildObj.horseRaceIsTakingBets) {
        msg.reply(`There is no horse race betting going on right now. You can use ?hr to start betting.`);
        return;
    }
    if (user.guildObj.userRunningHorseBet && user.guildObj.userRunningHorseBet !== user) {
        msg.reply(`Only the person who opened betting can close it`);
        return;
    }

    if (user.guildObj.horseRaceBetPool.entries.length === 0) {
        msg.reply(`You cannot close betting with 0 bets. Use **?cancel** if you want to cancel`);
        return;
    }

    msg.reply(`Closing bets for the next race...`);
    user.guildObj.horseRaceIsActive = false;
    user.guildObj.horseRaceIsTakingBets = false;
    start_horse_race(user, msg);
}

async function* horse_race_bet_timeout(guild: user_guild, duration: number, msg: Discord.Message) {
    while (guild.horseRaceIsTakingBets) {
        let timePassed = Date.now() - guild.horseRaceBetStartTime;
        if (timePassed > duration) {
            guild.horseRaceIsTakingBets = false;
            guild.horseRaceBetPool.entries = [];
            guild.horsesInRace = [];
            for (let i = 0; i < guild.users.length; ++i) {
                guild.users[i].state = user_state.none;
            }
            msg.reply(`Horse betting has been cancelled: Waited too long to start the race`);
            yield;
        }
        await delay(500);
    }
}

export async function process_horse_race_bet(user: user_account, horseNum: number, bet: number, msg: Discord.Message): Promise<void> {
    if (user.guildObj.horseRaceIsActive || (user.state !== user_state.none && user.state !== user_state.horseRacing)) return;
    if (!user.guildObj.horseRaceIsTakingBets) {
        msg.reply(`There is no horse race betting going on right now. You can use ?open to start betting.`);
        return;
    }

    let pool = user.guildObj.horseRaceBetPool;
    for (let i = 0; i < pool.entries.length; ++i) {
        let e = pool.entries[i];
        if (e.user === user && e.horse === user.guildObj.horsesInRace[horseNum]) {
            msg.reply(`${user.nickname}, you have already betted on that horse`);
            return;
        }
    }
    if (!verify_bet(user, bet, msg)) return;

    let horses = user.guildObj.horsesInRace;
    if (horseNum >= horses.length || horseNum < 0) {
        msg.reply(`Invalid horse number`);
        return;
    }

    let userBets = [];
    let betSum = 0;
    for (let i = 0; i < pool.entries.length; ++i) {
        const h = pool.entries[i];
        if (h.user === user) {
            userBets.push(h);
            betSum += h.bet;
        }
    }

    if (userBets.length >= cfg.maxHorseBets) {
        msg.reply(`You are already at the maximum bet count: **${cfg.maxHorseBets}** bet max`);
        return;
    }

    if (user.bones < betSum + bet) {
        msg.reply('You do not have enough bones to bet that much');
        return;
    }

    user.state = user_state.horseRacing;
    let horse = horses[horseNum];
    pool.entries.push(new bet_pool_entry(user, horse, bet));
    msg.reply(`${user.nickname}, you have placed a bet of ${bet.toLocaleString('en-US')} ${boneSymbol} on ${horse.name}`);
}

export async function display_placed_bets(pool: bet_pool, msg: Discord.Message) {
    let embed = new Discord.MessageEmbed().setTitle(`:horse_racing:  Placed Bets  :horse_racing:`).setColor('#AA8822');

    let betters = {};
    let betSum = 0;
    pool.entries.forEach((e: bet_pool_entry) => {
        if (!betters[e.user.nickname]) {
            betters[e.user.nickname] = [];
        }
        betters[e.user.nickname].push(e);
        betSum += e.bet;
    });

    let str = '';
    for (const key in betters) {
        let b: bet_pool_entry[] = betters[key];
        str = '';
        for (let i = 0; i < b.length; ++i) {
            let e: bet_pool_entry = b[i];
            str += `${boneSymbol} ${e.bet.toLocaleString('en-US')} on ${e.horse.name}\n`;
        }
        embed.addFields({ name: b[0].user.nickname, value: str, inline: false });
    }

    embed.addFields({ name: `Total Pot`, value: `${boneSymbol} ${betSum.toLocaleString('en-US')}`, inline: false });

    await msg.channel.send({ embeds: [embed] });
}

export async function start_horse_race_bet_taking(user: user_account, horse: race_horse, msg: Discord.Message) {
    if (user.guildObj.horseRaceIsActive || user_is_playing_game(user, msg)) return;
    if (user.guildObj.horseRaceIsTakingBets) {
        await msg.reply(`Bets are already being taken. Use **?bet** <horse number> <bet> to place your bet`);
        return;
    }
    await msg.reply(
        `Now taking bets for the next horse race!\n Enter **?bet** <horse number> <bet>\n Enter **?start** to end betting and begin the race(you must be the person who opened betting)\n` +
            `Use **?cancel** to cancel betting`
    );

    user.guildObj.horseRaceIsTakingBets = true;
    user.guildObj.userRunningHorseBet = user;

    user.guildObj.horseRaceBetStartTime = Date.now();
    user.guildObj.horseRaceBetTimeoutCoroutine = horse_race_bet_timeout(user.guildObj, cfg.horseRaceBetTimeoutDuration, msg);
    user.guildObj.horseRaceBetTimeoutCoroutine.next();

    let horseList = [...user.guildObj.horses.filter((h) => !horse || horse.name !== h.name)];
    shuffle(horseList);
    user.guildObj.horsesInRace = [];
    let startIdx = 0;
    if (horse) {
        user.guildObj.horsesInRace.push(horse);
        startIdx = 1;
    }
    for (let i = startIdx; i < 6; ++i) {
        user.guildObj.horsesInRace.push(horseList[i]);
    }

    await list_horses(user, msg, true, user.guildObj.horsesInRace);
    user.guildObj.horseRaceBetPool.entries = [];
}

export async function start_horse_race(user: user_account, msg: Discord.Message) {
    if (user.guildObj.horseRaceIsActive || user.guildObj.horseRaceIsTakingBets) return;

    user.guildObj.horseRaceBetTimeoutCoroutine.return();

    let horses = user.guildObj.horsesInRace;
    let trackLen = user.guildObj.horseTrackLen;

    horses.forEach((e: race_horse) => {
        e.trackPos = user.guildObj.horseTrackLen;
    });

    user.guildObj.horseRaceIsActive = true;
    let pool = user.guildObj.horseRaceBetPool;

    let str = '';
    await display_placed_bets(pool, msg);

    await delay(2000);

    let message = 'On your marks...';
    str = make_track_string(horses, trackLen, message);
    let msgRef = await msg.reply(str);
    await delay(2000);

    message = 'Get set...';
    str = make_track_string(horses, trackLen, message);
    await msgRef.edit(str);
    await delay(2000);

    message = 'BUST...';
    str = make_track_string(horses, trackLen, message, true);
    await msgRef.edit(str);
    await delay(1000);

    await run_horse_race(user, msgRef);
}

class horse_race_prize_winners {
    user: user_account;
    horse: race_horse;
    place: number;
    bet: number;
    constructor(user: user_account, horse: race_horse, place: number, bet: number) {
        this.user = user;
        this.horse = horse;
        this.place = place;
        this.bet = bet;
    }
}

export async function run_horse_race(user: user_account, msgRef: Discord.Message) {
    let horses = user.guildObj.horsesInRace;
    let trackLen = user.guildObj.horseTrackLen;
    let pool = user.guildObj.horseRaceBetPool;

    let placements: Array<race_horse> = [];
    while (placements.length < horses.length) {
        for (let h = 0; h < horses.length; ++h) {
            let speed = 1 + Math.round(Math.random() * 5 * horses[h].speed);
            horses[h].trackPos = Math.max(0, horses[h].trackPos - speed);
            horses[h].speedAverage.add(speed);

            if (horses[h].trackPos == 0 && !placements.includes(horses[h])) {
                placements.push(horses[h]);
            }
        }

        let str = make_track_string(horses, trackLen, '', false, false);
        await msgRef.edit(str);
        await delay(1000);
    }

    user.guildObj.horseRaceIsActive = false;

    let embed = new Discord.MessageEmbed().setTitle(`:horse_racing:  Race Results  :horse_racing:`).setColor('#AA8822');

    let totalPrizePool = 0;
    pool.entries.forEach((e: bet_pool_entry) => {
        e.user.state = user_state.none;
        totalPrizePool += e.bet;
    });
    totalPrizePool *= 2;

    placements[0].wins++;

    let winners = [];
    let losers = [];

    const prizePortions = [0.6, 0.3, 0.1];

    let commissions = [];

    let placeStr = '';
    for (let i = 0; i < placements.length; ++i) {
        let horse = placements[i];
        horse.placementAverage.add(i + 1);
        horse.races++;
        const pot = pool.get_horse_bets(placements[i]).toLocaleString('en-US');
        if (i == 0) {
            placeStr = `:first_place:`;
        } else if (i == 1) {
            placeStr = `:second_place:`;
        } else if (i == 2) {
            placeStr = `:third_place:`;
        } else {
            placeStr = `${i + 1}th`;
        }

        embed.addFields({
            name: `${placeStr} ${placements[i].name}`,
            value: `Pot: ${pot} ${boneSymbol}`,
            inline: false,
        });

        winners[i] = [];
        pool.entries.forEach((e: bet_pool_entry) => {
            if (e.horse === horse) {
                if (i < 3) {
                    winners[i].push(new horse_race_prize_winners(e.user, e.horse, i, e.bet));
                } else {
                    losers.push(e);
                }
            }
        });

        if (i < 3) {
            const commission = Math.floor(totalPrizePool * prizePortions[i] * cfg.horseRaceCommissionRate);
            let owner = user.guildObj.horseOwners[horse.handle];
            horse.commissionEarned += commission;
            horse.commissionPayments++;
            if (owner) {
                owner.add_money(commission);
                commissions.push({ owner: owner.name, horse: horse.name, money: commission });
                write_user_data_json(owner);
            } else {
                user.guildObj.houseBones += commission;
                commissions.push({ owner: 'Kevin', horse: horse.name, money: commission });
            }
        }
    }

    let winSums = [0, 0, 0];
    let placeEmoji = [':first_place:', ':second_place:', ':third_place:'];
    for (let i = 0; i < winSums.length; ++i) {
        winners[i].forEach((w: horse_race_prize_winners) => {
            winSums[i] += w.bet * 2;
        });
    }

    for (let i = 0; i < winners.length; ++i) {
        winners[i].sort((a: horse_race_prize_winners, b: horse_race_prize_winners) => {
            return a.bet - b.bet;
        });
    }

    let str = '';

    for (let i = 0; i < winners.length; ++i) {
        str = '';
        winners[i].forEach((w: horse_race_prize_winners) => {
            let p = w.bet / winSums[i];
            let prize = Math.floor(totalPrizePool * prizePortions[i] * p);
            prize -= Math.floor(prize * cfg.horseRaceCommissionRate);
            w.user.add_money(prize);
            w.user.update_stats(true, prize, game_category.horseRacing);

            write_user_data_json(w.user);
            str += `${boneSymbol} ${prize.toLocaleString('en-US')} goes to ${w.user.name}\n`;
        });
        if (winners[i].length > 0) {
            embed.addFields({ name: `${placeEmoji[i]} winners on ${placements[i].name}`, value: str, inline: false });
        }
    }

    losers.forEach((l: bet_pool_entry) => {
        l.user.add_money(-l.bet);
        l.user.update_stats(false, -l.bet, game_category.horseRacing);
        write_user_data_json(l.user);
    });

    user.guildObj.userRunningHorseBet = null;
    if (commissions.length > 0) {
        let commissionEmbed = new Discord.MessageEmbed().setTitle('Commission Payments').setColor('#2222BB');
        for (let i = 0; i < commissions.length; ++i) {
            str = `${boneSymbol} **${commissions[i].money.toLocaleString('en-US')}** from ${commissions[i].horse}\n`;
            commissionEmbed.addFields({ name: `${commissions[i].owner}`, value: str, inline: false });
        }
        await msgRef.channel.send({ embeds: [commissionEmbed] });
    }

    await msgRef.channel.send({ embeds: [embed] });
}
