import { user_account, user_guild } from './src/user';
import { delay, game_category, user_is_playing_game, verify_bet } from './src/utils';
import { EMOJIS, GIFS } from './src/media';
import { boneSymbol } from './src/symbols';
import Discord, { Guild } from 'discord.js';
import { strictEqual } from 'assert';
import { number } from 'zod';

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

export class race_horse {
    trackPos: number;
    name: string;
    age: number;

    wins: number;
    races: number;

    placementAverage: average_record;
    speedAverage: average_record;

    speed: number;

    constructor(name: string, trackPos: number) {
        this.name = name;
        this.trackPos = trackPos;
        this.speed = 0.9 + Math.random() * 0.2;
        this.age = 1 + Math.random() * 40;
        this.wins = 0;
        this.races = 0;
        this.placementAverage = new average_record();
        this.speedAverage = new average_record();
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
        str += ` | ${horses[h].name}\n`;
    }
    return str;
}

export async function list_horses(user: user_account, msg: Discord.Message) {
    let horses = user.guildObj.horses;

    let embed = new Discord.MessageEmbed().setTitle(`:horse: :farmer:  The Stables :woman_farmer: :horse:`).setColor('#BB2222');

    let i = 0;
    horses.forEach((h: race_horse) => {
        let str = `Races: ${h.races.toLocaleString('en-US')}\n`;
        str += `Wins: ${h.wins.toLocaleString('en-US')}\n`;
        str += `Avg Placement: ${h.placementAverage.get_average().toLocaleString('en-US')}\n`;
        str += `Avg Speed: ${Math.floor(h.speedAverage.get_average() * 13).toLocaleString('en-US')} mph\n`;
        embed.addFields({ name: `${i + 1}. :racehorse: ${h.name}`, value: str, inline: true });
        ++i;
    });

    await msg.reply({ embeds: [embed] });
}

export async function close_horse_race_betting(user: user_account, msg: Discord.Message): Promise<void> {
    if (user.guildObj.horseRaceIsActive) return;
    if (!user.guildObj.horseRaceIsTakingBets) {
        msg.reply(`There is no horse race betting going on right now. You can use ?open to start betting.`);
        return;
    }

    msg.reply(`Closing bets for the next race...`);
    user.guildObj.horseRaceIsActive = false;
    user.guildObj.horseRaceIsTakingBets = false;
    start_horse_race(user, msg);
}

export async function process_horse_race_bet(user: user_account, horseNum: number, bet: number, msg: Discord.Message): Promise<void> {
    if (user.guildObj.horseRaceIsActive) return;
    if (!user.guildObj.horseRaceIsTakingBets) {
        msg.reply(`There is no horse race betting going on right now. You can use ?open to start betting.`);
        return;
    }

    let pool = user.guildObj.horseRaceBetPool;
    for (let i = 0; i < pool.entries.length; ++i) {
        let e = pool.entries[i];
        if (e.user === user) {
            msg.reply(`${user.nickname}, you have already betted on a horse`);
            return;
        }
    }

    if (!verify_bet(user, bet, msg)) return;

    let horses = user.guildObj.horses;

    if (horseNum >= horses.length || horseNum < 0) {
        msg.reply(`Invalid horse number`);
        return;
    }

    let hasBetAlready = false;
    let horse = horses[horseNum];

    if (hasBetAlready) {
        msg.reply(`${user.nickname}, you have already bet on that horse`);
        return;
    }

    pool.entries.push(new bet_pool_entry(user, horse, bet));
    msg.reply(`${user.nickname}, you have placed a bet of ${bet.toLocaleString('en-US')} ${boneSymbol} on ${horse.name}`);
}

export async function start_horse_race_bet_taking(user: user_account, msg: Discord.Message) {
    if (user.guildObj.horseRaceIsActive || user.isPlayingGame) return;
    await msg.reply(
        `Now taking bets for the next horse race!\n Enter **?horse** <horse number> <bet>\n Enter **?close** to end betting and begin the race(you must be the person who opened betting)`
    );

    await list_horses(user, msg);
    user.guildObj.horseRaceBetPool.entries = [];
    user.guildObj.horseRaceIsTakingBets = true;
}

export async function start_horse_race(user: user_account, msg: Discord.Message) {
    if (user_is_playing_game(user, msg) || user.guildObj.horseRaceIsActive || user.guildObj.horseRaceIsTakingBets) return;

    let horses = user.guildObj.horses;
    let trackLen = user.guildObj.horseTrackLen;

    horses.forEach((e: race_horse) => {
        e.trackPos = user.guildObj.horseTrackLen;
    });

    user.guildObj.horseRaceIsActive = true;
    let pool = user.guildObj.horseRaceBetPool;

    let str = 'Bets placed: \n';
    pool.entries.forEach((e) => {
        str += `${e.user.nickname} placed ${e.bet} ${boneSymbol} on ${e.horse.name}\n`;
    });
    await msg.channel.send(str);
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
    place: number;
    bet: number;
    constructor(user: user_account, place: number, bet: number) {
        this.user = user;
        this.place = place;
        this.bet = bet;
    }
}

export async function run_horse_race(user: user_account, msgRef: Discord.Message) {
    let horses = user.guildObj.horses;
    let trackLen = user.guildObj.horseTrackLen;
    let pool = user.guildObj.horseRaceBetPool;

    let placements: Array<race_horse> = [];
    while (placements.length < horses.length) {
        for (let h = 0; h < horses.length; ++h) {
            let speed = 2 + Math.round(Math.random() * 7 * horses[h].speed);
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

    let embed = new Discord.MessageEmbed().setTitle(`:horse_racing:  Results  :horse_racing:`).setColor('#AA8822');

    let totalPrizePool = 0;
    pool.entries.forEach((e: bet_pool_entry) => {
        totalPrizePool += e.bet;
    });
    totalPrizePool *= 2;

    placements[0].wins++;

    let winners = [];
    let losers = [];

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
                    winners[i].push(new horse_race_prize_winners(e.user, i, e.bet));
                } else {
                    losers.push(e);
                }
            }
        });
    }

    let winSums = [0, 0, 0];
    for (let i = 0; i < winSums.length; ++i) {
        winners[i].forEach((w: horse_race_prize_winners) => {
            winSums[i] += w.bet;
        });
    }

    for (let i = 0; i < winners.length; ++i) {
        winners[i].sort((a: horse_race_prize_winners, b: horse_race_prize_winners) => {
            return a.bet - b.bet;
        });
    }

    let str = '';
    winners[0].forEach((w: horse_race_prize_winners) => {
        let p = w.bet / winSums[0];
        let prize = Math.floor(totalPrizePool * 0.7 * p);
        w.user.add_money(prize);
        w.user.update_stats(true, prize, game_category.horseRacing);
        str += `${prize.toLocaleString('en-US')} ${boneSymbol} goes to ${w.user.name}\n`;
    });
    if (winners[0].length > 0) {
        embed.addFields({ name: `:first_place: winners on ${placements[0].name}`, value: str, inline: false });
    }

    str = '';
    winners[1].forEach((w: horse_race_prize_winners) => {
        let p = w.bet / winSums[1];
        let prize = Math.floor(totalPrizePool * 0.2 * p);
        w.user.add_money(prize);
        w.user.update_stats(true, prize, game_category.horseRacing);
        str += `${prize.toLocaleString('en-US')} ${boneSymbol} goes to ${w.user.name}\n`;
    });
    if (winners[1].length > 0) {
        embed.addFields({ name: `:second_place: winners on ${placements[1].name}`, value: str, inline: false });
    }

    str = '';
    winners[2].forEach((w: horse_race_prize_winners) => {
        let p = w.bet / winSums[2];
        let prize = Math.floor(totalPrizePool * 0.1 * p);
        w.user.add_money(prize);
        w.user.update_stats(true, prize, game_category.horseRacing);
        str += `${prize.toLocaleString('en-US')} ${boneSymbol} goes to ${w.user.name}\n`;
    });
    if (winners[2].length > 0) {
        embed.addFields({ name: `:third_place: winners on ${placements[2].name}`, value: str, inline: false });
    }

    losers.forEach((l: bet_pool_entry) => {
        l.user.add_money(-l.bet);
        l.user.update_stats(false, -l.bet, game_category.horseRacing);
    });

    await msgRef.channel.send({ embeds: [embed] });
}
