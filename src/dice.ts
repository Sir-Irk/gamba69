import { diceEmoji, boneSymbol } from './symbols';
import { verify_bet, user_is_playing_game, delay, game_category } from './utils';
import { EMOJIS, GIFS } from './media';
import { user_account, user_state } from './user';
import * as Discord from 'discord.js';

export async function dice_game(user: user_account, bet: number, msg: Discord.Message) {
    if (user_is_playing_game(user, msg) || !verify_bet(user, bet, msg)) return;
    user.state = user_state.playingGame;

    const betStr = bet.toLocaleString('en-US');

    let msgRef = null;
    if (bet == user.bones) {
        msgRef = await msg.reply(
            `${diceEmoji} ${user.nickname} goes big dick and bets **all** of their **${betStr}** ${boneSymbol}, Rolling the dice...`
        );
    } else {
        msgRef = await msg.reply(`${diceEmoji} ${user.nickname} You bet **${betStr}** ${boneSymbol}, Rolling the dice...`);
    }

    await delay(2000);
    let dice0 = 1 + Math.floor(Math.random() * 6);
    let dice1 = 1 + Math.floor(Math.random() * 6);
    const sum0 = dice0 + dice1;
    await msgRef.edit(msgRef.content + `\n${diceEmoji} ${user.nickname}, you rolled **${dice0}** and **${dice1}**...`);

    await delay(2000);
    let dice2 = 1 + Math.floor(Math.random() * 6);
    let dice3 = 1 + Math.floor(Math.random() * 6);
    const sum1 = dice2 + dice3;
    await msgRef.edit(msgRef.content + `\n${diceEmoji} ${user.nickname}, I rolled **${dice2}** and **${dice3}**...`);

    await delay(1000);

    let won = true;
    let prize = 0;
    if (sum0 > sum1) {
        if (dice0 == 6 && dice1 == 6) {
            prize = bet;
            const prizeStr = prize.toLocaleString('en-US');
            await msg.reply(`${EMOJIS.imBigEmoji} ${user.nickname}, You rolled a **double 6** and win **${prizeStr}** ${boneSymbol}`);
        } else if (dice0 == dice1) {
            prize = bet;
            const prizeStr = prize.toLocaleString('en-US');
            await msg.reply(`${EMOJIS.imBigEmoji} ${user.nickname}, You rolled a **double** and win **${prizeStr}** ${boneSymbol}`);
        } else {
            prize = bet;
            const prizeStr = prize.toLocaleString('en-US');
            await msg.reply(`${EMOJIS.imBigEmoji} ${user.nickname}, You win **${prizeStr}** ${boneSymbol}`);
        }
        await msg.channel.send(`${GIFS.toCashFlowGif}`);
    } else if (sum1 > sum0) {
        prize = -bet;
        won = false;
        await msg.reply(`:skull_crossbones: ${user.nickname}, My bones! You lose **${bet.toLocaleString('en-US')}** ${boneSymbol}.`);
        await msg.channel.send(`${GIFS.youBustedGif}`);
    } else {
        won = false;
        await msg.reply(`${EMOJIS.cringeEmoji} ${user.nickname}, It's a tie... that's pretty cringe`);
    }

    user.add_money(prize);
    user.update_stats(won, prize, game_category.dice);
    user.state = user_state.none;
}
