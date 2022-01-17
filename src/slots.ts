import { cfg } from './bot_cfg';
import { boneSymbol, slotSymbols, slotBlanks } from './symbols';
import { verify_bet, user_is_playing_game, delay, game_category } from './utils';
import { GIFS } from './media';
import * as Discord from 'discord.js';
import { user_account, user_state } from './user';

const slotMessages = [
    [
        `I'm the Joker, Baby!`,
        `All roads lead to Mr. Wonderful`,
        `Look at those tight little asses`,
        `Good old Curly Terry. What's he so happy about anyways?`,
        `The cakes not very big, but you are`,
    ],
    [
        `Dwee, dah dah shrah, plah plah sah, dah dah rah, plav da shree, loh ku pah, dav du sah! Soo-da-li dwee-daht, soo-da-li doo-ton plah-blah`,
        `I'm rich. Maybe you should invest in my ETFs`,
        `WOOOOOOOO`,
        `🎵 *Low Rider by War starts playing* 🎵`,
        `The curliest well in town`,
    ],
];

export let slotPoints = [1.25, 2, 3, 4, 5];
const slotWeights = [0.5, 0.45, 0.4, 0.35, 0.25];
for (let i = 0; i < slotPoints.length; ++i) {
    slotPoints[i] *= cfg.globalSlotPointsModifier;
}
const slotsEmoji = '🎰';

function random_slot(weights: number[]): number {
    let sum = 0;
    for (let i = 0; i < weights.length; ++i) {
        sum += weights[i];
    }

    let rand = Math.random() * sum;
    for (let i = 0; i < weights.length; ++i) {
        if (rand < weights[i]) {
            return i;
        }
        rand -= weights[i];
    }
    console.log('Random slot error');
}

export async function slots_game(user: user_account, bet: number, msg: Discord.Message): Promise<void> {
    if (user_is_playing_game(user, msg) || !verify_bet(user, bet, msg)) return;
    user.state = user_state.playingGame;
    const betStr = bet.toLocaleString('en-US');
    if (bet == user.bones) {
        await msg.channel.send(
            `${slotsEmoji} ${user.nickname} Slams their fat cock on the table and bets **all** of their **${betStr}** ${boneSymbol} and cranks the lever...`
        );
    } else {
        await msg.channel.send(`${slotsEmoji} ${user.nickname} bets **${betStr}** ${boneSymbol} and cranks the lever...`);
    }
    //let str = `${slotsEmoji} ${user.name} \n`;
    let str = ``;
    for (let y = 0; y < 3; ++y) {
        for (let x = 0; x < 3; ++x) {
            const idx = Math.floor(Math.random() * slotBlanks.length);
            str += slotBlanks[idx];
        }
        str += '\n';
    }
    //let msgRef =
    const msgRef = await msg.reply(str);

    const slotSetRoll = Math.floor(Math.random() * slotSymbols.length);
    //const slotSetRoll = 1;
    const slotSet = slotSymbols[slotSetRoll];
    const messages = slotMessages[slotSetRoll];

    let userSlots = [];
    //userSlots = [2, 3, 2, 4, 3, 1, 1, 4, 0];
    for (let i = 0; i < 9; ++i) userSlots.push(random_slot(slotWeights));

    await delay(cfg.slotsMessageDelay);
    str = `\n`;
    for (let y = 0; y < 3; ++y) {
        str += slotSet[userSlots[y * 3]];
        for (let x = 1; x < 3; ++x) {
            const idx = Math.floor(Math.random() * slotBlanks.length);
            str += slotBlanks[idx];
        }
        str += '\n';
    }

    await msgRef.edit(str);
    await delay(cfg.slotsMessageDelay);

    str = `\n`;
    for (let y = 0; y < 3; ++y) {
        str += slotSet[userSlots[y * 3 + 0]];
        str += slotSet[userSlots[y * 3 + 1]];
        for (let x = 2; x < 3; ++x) {
            const idx = Math.floor(Math.random() * slotBlanks.length);
            str += slotBlanks[idx];
        }
        str += '\n';
    }

    await msgRef.edit(str);
    await delay(cfg.slotsMessageDelay);

    str = `\n`;
    for (let y = 0; y < 3; ++y) {
        for (let x = 0; x < 3; ++x) {
            str += slotSet[userSlots[y * 3 + x]];
        }
        str += '\n';
    }
    await msgRef.edit(str);
    await delay(1000);

    let threeInARows = [];
    for (let y = 0; y < 3; ++y) {
        const i = y * 3;
        if (userSlots[i] == userSlots[i + 1] && userSlots[i] == userSlots[i + 2]) {
            threeInARows.push(userSlots[i]);
        }
    }
    let threeInAColumns = [];
    for (let x = 0; x < 3; ++x) {
        if (userSlots[x] == userSlots[x + 3] && userSlots[x] == userSlots[x + 6]) {
            threeInAColumns.push(userSlots[x]);
        }
    }

    let threeInADiagonals = [];

    if (userSlots[0] == userSlots[4] && userSlots[0] == userSlots[8]) threeInADiagonals.push(userSlots[0]);
    if (userSlots[2] == userSlots[4] && userSlots[2] == userSlots[6]) threeInADiagonals.push(userSlots[2]);

    threeInADiagonals.sort((a, b) => {
        return a < b ? 1 : a > b ? -1 : 0;
    });
    threeInAColumns.sort((a, b) => {
        return a < b ? 1 : a > b ? -1 : 0;
    });
    threeInARows.sort((a, b) => {
        return a < b ? 1 : a > b ? -1 : 0;
    });

    let points = 0;
    for (let i = 0; i < threeInARows.length; i++) points += slotPoints[threeInARows[i]];
    for (let i = 0; i < threeInAColumns.length; i++) points += slotPoints[threeInAColumns[i]];
    for (let i = 0; i < threeInADiagonals.length; i++) points += slotPoints[threeInADiagonals[i]];

    let betBonus = Math.round(bet + bet * points * 0.5);

    let messageIdx = 0;
    if (threeInARows.length > 0) messageIdx = threeInARows[0];
    if (threeInAColumns.length > 0) messageIdx = Math.max(messageIdx, threeInAColumns[0]);
    if (threeInADiagonals.length > 0) messageIdx = Math.max(messageIdx, threeInADiagonals[0]);

    let greatestSlot = -1;
    let comboCount = 0;
    let combos = [];
    if (threeInARows.length === 0 && threeInAColumns.length === 0 && threeInADiagonals.length === 0) {
        const sorted = userSlots.sort((a, b) => {
            return b - a;
        });

        let previousSlot = sorted[0];
        for (let i = 1; i < sorted.length; ++i) {
            if (sorted[i] === previousSlot) {
                comboCount++;
            } else if (comboCount < 2) {
                comboCount = 0;
            }

            if ((i == sorted.length - 1 && comboCount >= 2) || (sorted[i] !== previousSlot && comboCount >= 2)) {
                combos.push([previousSlot, comboCount]);
                comboCount = 0;
            }
            previousSlot = sorted[i];
        }
    }

    if (combos.length > 0) {
        combos.sort((a, b) => {
            return b[1] - a[1];
        });
        betBonus = Math.round(bet * 0.2 * (slotPoints[combos[0][0]] * 0.2 * combos[0][1]));
    }

    let prize = 0;
    let won = true;
    if (points > 0) {
        prize = Math.round(points * bet);
        await msg.reply(
            `${slotsEmoji} ${user.nickname}, EZ! You won **${prize.toLocaleString('en-US')}** ${boneSymbol}\n${slotSet[messageIdx]} ${
                messages[messageIdx]
            }`
        );
        await msg.channel.send(`${GIFS.winSlotsGif}`);
    } else {
        const lossStr = (bet - betBonus).toLocaleString('en-US');
        const bonusStr = betBonus.toLocaleString('en-US');
        if (combos.length > 0) {
            prize = -(bet - betBonus);
            won = false;
            const slotStr = `${slotSymbols[slotSetRoll][combos[0][0]]}`;
            const betStr = bet.toLocaleString('en-US');
            await msg.reply(
                `${slotsEmoji} ${user.nickname}, You Lost **${betStr}** ${boneSymbol} but won back **${bonusStr}** ${boneSymbol} from a ${slotStr} **combo**`
            );
        } else {
            prize = -bet;
            won = false;
            await msg.reply(`${slotsEmoji} ${user.nickname}, Damn, too bad... You lost **${bet.toLocaleString('en-US')}** ${boneSymbol}`);
        }
        await msg.channel.send(`${GIFS.loseSlotsGif}`);
    }

    user.add_money(prize);
    user.update_stats(won, prize, game_category.slots);
    user.state = user_state.none;
}
