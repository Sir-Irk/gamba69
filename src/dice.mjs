import { diceEmoji, boneSymbol } from './symbols.mjs';
import { verify_bet, user_is_playing_game, delay } from './utils.mjs';
import { EMOJIS, GIFS } from './media.mjs';

export async function dice_game(user, bet, msg) {
    if (user_is_playing_game(user, msg) || !verify_bet(user, bet, msg)) return;
    user.isPlayingGame = true;

    const betStr = bet.toLocaleString('en-US');

    let msgRef = null;
    if (bet == user.bones) {
        msgRef = await msg.reply(`${diceEmoji} ${user.nickname} goes big dick and bets **all** of their **${betStr}** ${boneSymbol}, Rolling the dice...`);
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

    if (sum0 > sum1) {
        if (dice0 == 6 && dice1 == 6) {
            const prize = bet * 3;
            user.bones += prize;
            user.diceGamesBonesWon += prize;
            user.guildObj.houseBones -= prize;
            const prizeStr = prize.toLocaleString('en-US');
            await msg.reply(`${EMOJIS.imBigEmoji} ${user.nickname}, You rolled a **double 6** and win **${prizeStr}** ${boneSymbol}`);
        } else if (dice0 == dice1) {
            const prize = bet * 2;
            user.bones += prize;
            user.diceGamesBonesWon += prize;
            user.guildObj.houseBones -= prize;
            const prizeStr = prize.toLocaleString('en-US');
            await msg.reply(`${EMOJIS.imBigEmoji} ${user.nickname}, You rolled a **double** and win **${prizeStr}** ${boneSymbol}`);
        } else {
            const prize = bet;
            user.bones += prize;
            user.diceGamesBonesWon += prize;
            user.guildObj.houseBones -= prize;
            const prizeStr = prize.toLocaleString('en-US');
            await msg.reply(`${EMOJIS.imBigEmoji} ${user.nickname}, You win **${prizeStr}** ${boneSymbol}`);
        }
        user.diceGamesWon++;
        user.guildObj.diceGamesWon++;
        await msg.channel.send(`${GIFS.toCashFlowGif}`);
    } else if (sum1 > sum0) {
        user.guildObj.houseBones += bet;
        user.bones -= bet;
        user.diceGamesBonesWon -= bet;
        user.guildObj.houseBones += bet;
        await msg.reply(`:skull_crossbones: ${user.nickname}, My bones! You lose **${bet.toLocaleString('en-US')}** ${boneSymbol}.`);
        await msg.channel.send(`${GIFS.youBustedGif}`);
    } else {
        await msg.reply(`${EMOJIS.cringeEmoji} ${user.nickname}, It's a tie... that's pretty cringe`);
    }
    user.diceGamesPlayed++;
    user.guildObj.diceGamesPlayed++;
    user.guildObj.gamesPlayed++;
    user.isPlayingGame = false;
}
