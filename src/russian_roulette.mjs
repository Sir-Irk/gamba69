import { boneSymbol } from './symbols.mjs';
import { cfg } from './bot_cfg.mjs';
import { verify_bet, user_is_playing_game, delay } from './utils.mjs';
import { EMOJIS, GIFS } from './media.mjs';

export class roulette_game_data {
    constructor() {
        this.roll = 0;
        this.counter = 0;
        this.timeOfLastResponse = 0;
        this.baseBet = 0;
        this.bet = 0;
        this.isPullingTheTrigger = false;
    }
}

export async function roulette_game(user, bet, msg) {
    if (user_is_playing_game(user, msg) || !verify_bet(user, bet, msg)) return;
    if (user.rl.counter > 0 || user.rl.isPullingTheTrigger) {
        await msg.channel.send(`${user.nickname}, You are already playing roulette`);
        return;
    }

    user.isPlayingGame = true;

    if (user.rl.counter == 0) {
        user.rl.roll = Math.floor(Math.random() * 7);
    }

    user.rl.isPullingTheTrigger = true;

    const betStr = bet.toLocaleString('en-US');

    if (bet == user.bones) {
        await msg.channel.send(
            `${EMOJIS.interestedSharkEmoji} :grimacing: :gun: ${user.nickname} puts their massive balls on the line for **all** of their **${betStr}** ${boneSymbol}...`
        );
    } else {
        await msg.channel.send(
            `${EMOJIS.interestedSharkEmoji} :grimacing: :gun: ${user.nickname} puts their life on the line for **${betStr}** ${boneSymbol}...`
        );
    }

    await delay(3000);

    if (user.rl.counter == user.rl.roll) {
        await msg.channel.send(`${EMOJIS.interestedSharkEmoji} :skull_crossbones: You died! You lose **${betStr}** ${boneSymbol}`);
        await msg.channel.send(`${GIFS.youDiedGif}`);
        user.bones -= bet;
        user.rlGamesBonesWon -= bet;
        user.guildObj.houseBones += bet;
        user.rl.counter = 0;
        user.isPlayingGame = false;
        user.rlGamesPlayed++;
        user.guildObj.rlGamesPlayed++;
        user.guildObj.gamesPlayed++;
    } else {
        user.rl.counter = 1;
        user.rl.baseBet = bet;
        user.rl.bet = Math.round(user.rl.baseBet * 0.1);
        user.bones += user.rl.bet;
        user.rlGamesBonesWon += user.rl.bet;
        user.guildObj.houseBones -= user.rl.bet;
        user.rl.timeOfLastResponse = Date.now();
        const prizeStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        await msg.channel.send(`${EMOJIS.whySharkEmoji} :relieved: ${user.nickname}, You live! for now... You won back **${prizeStr}** ${boneSymbol}`);
        await delay(500);
        const nextBet = user.rl.bet * 2;
        const nextBetStr = (user.rl.baseBet + nextBet).toLocaleString('en-US');
        await msg.channel.send(
            `${EMOJIS.interestedSharkEmoji} ${user.nickname}, Type **continue** to try for **${nextBetStr}** ${boneSymbol} or **end** to stop now`
        );
    }

    user.rl.isPullingTheTrigger = false;
}

export async function roulette_game_continue(user, msg) {
    if (user.rl.counter == 0 || user.rl.isPullingTheTrigger) return;
    const timeSinceLastResponse = Date.now() - user.rl.timeOfLastResponse;
    if (timeSinceLastResponse >= cfg.rouletteContinueTimeout) {
        user.rl.bet = 0;
        user.rl.baseBet = 0;
        user.rl.counter = 0;
        user.isPlayingGame = false;
        user.rlGamesPlayed++;
        user.guildObj.rlGamesPlayed++;
        user.guildObj.gamesPlayed++;
        msg.reply('You waited too long to continue the roulette lol');
        return;
    }

    user.rl.timeOfLastResponse = Date.now();

    const bet = user.rl.bet;
    const betStr = (user.rl.baseBet + bet).toLocaleString('en-US');
    user.rl.isPullingTheTrigger = true;
    await msg.channel.send(
        `${EMOJIS.doubtfulSharkEmoji} :grimacing: :gun: ${user.nickname} lets it ride and puts their life on the line for **${betStr}** ${boneSymbol}`
    );

    await delay(3000);

    if (user.rl.counter == user.rl.roll) {
        user.bones -= user.rl.baseBet + user.rl.bet;
        user.rlGamesBonesWon -= user.rl.baseBet + user.rl.bet;
        user.guildObj.houseBones += user.rl.baseBet + user.rl.bet;
        user.rl.counter = 0;
        const lossStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        await msg.channel.send(`${EMOJIS.interestedSharkEmoji} :skull_crossbones: You died! You lose **${lossStr}** ${boneSymbol}`);
        await msg.channel.send(`${GIFS.youDiedGif}`);
        user.isPlayingGame = false;
        user.rlGamesPlayed++;
        user.guildObj.rlGamesPlayed++;
    } else if (user.rl.counter == 5) {
        user.rl.bet += user.rl.bet;
        user.rlGamesBonesWon += user.rl.bet;
        user.guildObj.houseBones -= user.rl.bet;
        user.rl.counter = 0;
        user.bones += user.rl.bet;
        const prizeStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        await msg.channel.send(`${EMOJIS.imBigEmoji} ${user.nickname}, You won all rounds! You won **${prizeStr}** ${boneSymbol}`);
        await msg.channel.send(`${GIFS.rouletteWinGif}`);
        user.isPlayingGame = false;
        user.rlGamesPlayed++;
        user.guildObj.rlGamesPlayed++;
        user.rlGamesWon++;
        user.guildObj.rlGamesWon++;
    } else {
        user.rl.counter++;
        user.bones += user.rl.bet;
        user.rlGamesBonesWon += user.rl.bet;
        user.guildObj.houseBones -= user.rl.bet;
        user.rl.bet += user.rl.bet;
        const prizeStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        const nextBetStr = (user.rl.baseBet + user.rl.bet * 2).toLocaleString('en-US');
        await msg.channel.send(`${EMOJIS.whySharkEmoji} :relieved: ${user.nickname}, You live! for now... You won back **${prizeStr}** ${boneSymbol}`);
        await msg.channel.send(
            `${EMOJIS.interestedSharkEmoji} ${user.nickname}, Type **continue** to try for **${nextBetStr}** ${boneSymbol} or **end** to stop now`
        );
    }
    user.rl.isPullingTheTrigger = false;
}
