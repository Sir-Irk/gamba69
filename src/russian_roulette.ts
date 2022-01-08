import { boneSymbol } from './symbols.js';
import { cfg } from './bot_cfg.js';
import { verify_bet, user_is_playing_game, delay, game_category } from './utils.js';
import { EMOJIS, GIFS } from './media.js';
import { user_account } from './user.js';
import Discord from 'discord.js';

export class roulette_game_data {
    roll: number;
    counter: number;
    timeOfLastResponse: number;
    baseBet: number;
    bet: number;
    isPullingTheTrigger: boolean;
    constructor() {
        this.roll = 0;
        this.counter = 0;
        this.timeOfLastResponse = 0;
        this.baseBet = 0;
        this.bet = 0;
        this.isPullingTheTrigger = false;
    }
}

export async function roulette_game(user: user_account, bet: number, msg: Discord.Message) {
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
        const prize = -bet;
        user.add_money(prize);
        user.update_stats(false, prize, game_category.roulette);
        user.rl.counter = 0;
        user.isPlayingGame = false;
    } else {
        user.rl.counter = 1;
        user.rl.baseBet = bet;
        user.rl.bet = Math.round(user.rl.baseBet * 0.1);
        const prize = user.rl.bet;
        user.add_money(prize);
        user.update_stats(true, prize, game_category.roulette);
        user.rl.timeOfLastResponse = Date.now();
        const prizeStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        await msg.channel.send(
            `${EMOJIS.whySharkEmoji} :relieved: ${user.nickname}, You live! for now... You won back **${prizeStr}** ${boneSymbol}`
        );
        await delay(500);
        const nextBet = user.rl.bet * 2;
        const nextBetStr = (user.rl.baseBet + nextBet).toLocaleString('en-US');
        await msg.channel.send(
            `${EMOJIS.interestedSharkEmoji} ${user.nickname}, Type **continue** to try for **${nextBetStr}** ${boneSymbol} or **end** to stop now`
        );
    }

    user.rl.isPullingTheTrigger = false;
}

export async function roulette_game_continue(user: user_account, msg: Discord.Message) {
    if (user.rl.counter == 0 || user.rl.isPullingTheTrigger) return;
    const timeSinceLastResponse = Date.now() - user.rl.timeOfLastResponse;
    if (timeSinceLastResponse >= cfg.rouletteContinueTimeout) {
        user.rl.bet = 0;
        user.rl.baseBet = 0;
        user.rl.counter = 0;
        user.isPlayingGame = false;
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

    let prize = 0;
    let won = true;
    if (user.rl.counter == user.rl.roll) {
        prize = -(user.rl.baseBet + user.rl.bet);
        won = false;
        user.rl.counter = 0;
        user.isPlayingGame = false;
        const lossStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        await msg.channel.send(`${EMOJIS.interestedSharkEmoji} :skull_crossbones: You died! You lose **${lossStr}** ${boneSymbol}`);
        await msg.channel.send(`${GIFS.youDiedGif}`);
    } else if (user.rl.counter == 5) {
        user.rl.bet += user.rl.bet;
        prize = user.rl.bet;
        user.rl.counter = 0;
        const prizeStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        await msg.channel.send(`${EMOJIS.imBigEmoji} ${user.nickname}, You won all rounds! You won **${prizeStr}** ${boneSymbol}`);
        await msg.channel.send(`${GIFS.rouletteWinGif}`);
        user.isPlayingGame = false;
    } else {
        prize = user.rl.bet;
        user.rl.bet += user.rl.bet;
        user.rl.counter++;
        const prizeStr = (user.rl.baseBet + user.rl.bet).toLocaleString('en-US');
        const nextBetStr = (user.rl.baseBet + user.rl.bet * 2).toLocaleString('en-US');
        await msg.channel.send(
            `${EMOJIS.whySharkEmoji} :relieved: ${user.nickname}, You live! for now... You won back **${prizeStr}** ${boneSymbol}`
        );
        await msg.channel.send(
            `${EMOJIS.interestedSharkEmoji} ${user.nickname}, Type **continue** to try for **${nextBetStr}** ${boneSymbol} or **end** to stop now`
        );
    }
    user.add_money(prize);
    user.update_stats(won, prize, game_category.roulette);
    user.rl.isPullingTheTrigger = false;
}
