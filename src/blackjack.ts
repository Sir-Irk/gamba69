import { boneSymbol } from './symbols.js';
import { cfg } from './bot_cfg.js';
import { verify_bet, user_is_playing_game, delay, shuffle, add_money_to_user, parse_bet, game_category } from './utils.js';
//import { get_thousands_int, get_percentage_int, shuffle } from './utils.mjs';
import { GIFS, EMOJIS } from './media.js';
import { user_account, user_state } from './user.js';
import Discord from 'discord.js';

const BJ_DECK_COUNT = 2;

// @formatter:off
const cardSymbols = [
    '🂱',
    '🂲',
    '🂳',
    '🂴',
    '🂵',
    '🂶',
    '🂷',
    '🂸',
    '🂹',
    '🂺',
    '🂻',
    '🂽',
    '🂾',
    '🂡', //Hearts
    '🂢',
    '🂣',
    '🂤',
    '🂥',
    '🂦',
    '🂧',
    '🂨',
    '🂩',
    '🂪',
    '🂫',
    '🂭',
    '🂮',
    '🃑',
    '🃒',
    '🃓',
    '🃔',
    '🃕',
    '🃖',
    '🃗',
    '🃘',
    '🃙',
    '🃚',
    '🃛',
    '🃝',
    '🃞',
    '🃁',
    '🃂',
    '🃃',
    '🃄',
    '🃅',
    '🃆',
    '🃇',
    '🃈',
    '🃉',
    '🃊',
    '🃋',
    '🃍',
    '🃎',
];

const cardValues: number[] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 1, 2,
    3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10,
];

function create_deck(numDecks: number) {
    let deck: number[] = [];
    for (let i = 0; i < 52 * numDecks; ++i) {
        deck.push(i % 52);
    }
    return deck;
}

function deal_card(user: user_account, msg: Discord.Message) {
    let deck = user.bj.deck;
    if (deck.length === 0) {
        deck = create_deck(BJ_DECK_COUNT);
        shuffle(deck);
        user.bj.deck = deck;
        msg.reply(`Deck has been reshuffled. Playing with ${BJ_DECK_COUNT}`);
    }

    return deck.pop();
}

export const hiddenCard = '🂠';

class blackjack_game_data {
    deck: number[];
    userCards: number[];
    houseCards: number[];
    round: number;
    bet: number;
    isDealingHand: boolean;
    lossStreak: number;
    constructor() {
        this.deck = [];
        this.userCards = [];
        this.houseCards = [];
        this.round = 0;
        this.bet = 0;
        this.isDealingHand = false;
        this.lossStreak = 0;
    }
}

function blackjack_sum_cards(cards: number[], count: number, startIdx: number = 0): number {
    let result = 0;
    let numAces = 0;
    for (let i = startIdx; i < count; i++) {
        if (cardValues[cards[i]] === 1) {
            ++numAces;
        }
    }
    for (let i = startIdx; i < count; i++) {
        result += cardValues[cards[i]];
    }

    if (result + 10 <= 21) {
        if (numAces == 2 && count == 2) {
            result = 21;
        } else if (numAces > 0) {
            result += 10;
        }
    }

    return result;
}

function make_blackjack_hand_string(cards: number[], count: number, sum: number): string {
    let result: string = '';
    for (let i = 0; i < count; i++) {
        result += `${cardSymbols[cards[i]]} `;
    }
    result += `= ${sum}`;

    let numAces = 0;
    for (let i = 0; i < count; i++) {
        if (cardValues[cards[i]] === 1) {
            ++numAces;
        }
    }
    if (sum + 10 <= 21) {
        if (numAces === 2 && count === 2) {
            result += ` or ${sum - 19}`;
        } else if (numAces > 0) {
            result += ` or ${sum - 10}`;
        }
    }

    return result;
}

function blackjack_game_end(user) {
    user.bj.round = 0;
    user.bj.lossStreak = 0;
    user.bj.isDealingHand = false;
    user.isPlayingGame = false;
}

const blackjack_option = {
    hit: 'hit',
    stand: 'stand',
    doubleDown: 'double',
    resign: 'resign',
};

async function blackjack_game(user: user_account, bet: number, msg: Discord.Message) {
    if (user_is_playing_game(user, msg) || !verify_bet(user, bet, msg)) return;

    user.state = user_state.playingGame;
    user.bj.round = 1;
    user.bj.isDealingHand = true;

    const betStr = bet.toLocaleString('en-US');
    let msgRef = null;
    if (bet == user.bones) {
        msgRef = await msg.reply(
            `:black_joker: ${user.nickname} Slams their massive balls on the table and bets **all** of their **${betStr}** ${boneSymbol} on a game of Blackjack, Dealing hand...`
        );
    } else {
        msgRef = await msg.reply(
            `:black_joker: ${user.nickname} puts down **${betStr}** ${boneSymbol} on a game of Blackjack, Dealing hand...`
        );
    }

    if (user.bj.deck.length === 0) {
        user.bj.deck = create_deck(BJ_DECK_COUNT);
        shuffle(user.bj.deck);
        await msg.reply(`Deck Shuffled. Playing with ${BJ_DECK_COUNT} decks`);
    }

    await delay(cfg.bjMessageDelay);

    const userCards: number[] = [deal_card(user, msg), deal_card(user, msg)];

    user.bj.userCards = userCards;
    let userSum = cardValues[userCards[0]] + cardValues[userCards[1]];
    let str = `:black_joker: ${user.nickname}, you have ${cardSymbols[userCards[0]]} ${cardSymbols[userCards[1]]} = ${userSum}`;

    let userAltSum = blackjack_sum_cards(userCards, 2, 0);
    let userHasNaturalBj = false;
    if ((cardValues[userCards[0]] == 1 && cardValues[userCards[1]] == 1) || userAltSum == 21) {
        str = `:black_joker: ${user.nickname}, you have ${cardSymbols[userCards[0]]} ${cardSymbols[userCards[1]]} = ${userAltSum}`;
        userHasNaturalBj = true;
        str += ` **Blackjack**`;
    } else if (cardValues[userCards[0]] == 1 || (cardValues[userCards[1]] == 1 && userAltSum < 21)) {
        str += ` or ${userSum + 10}`;
    }
    await msgRef.edit(msgRef.content + '\n' + str);

    await delay(cfg.bjMessageDelay);

    const houseCards: number[] = [deal_card(user, msg), deal_card(user, msg)];

    user.bj.houseCards = houseCards;
    let houseSum = cardValues[houseCards[0]];
    str = `:black_joker: ${user.nickname}, I have ${cardSymbols[houseCards[0]]} ${hiddenCard} = ${houseSum}`;
    if (cardValues[houseCards[0]] == 1) {
        str += ` or ${houseSum + 10}`;
    }
    str += ` + ?`;
    await msgRef.edit(msgRef.content + '\n' + str);
    await delay(cfg.bjMessageDelay);

    houseSum = blackjack_sum_cards(houseCards, 2, 0);
    str = `:black_joker: ${user.nickname}, You have a blackjack... and I have `;
    if (userHasNaturalBj) {
        str += `${cardSymbols[houseCards[1]]} ${cardSymbols[houseCards[0]]} = ${houseSum}`;
        await msgRef.edit(msgRef.content + '\n' + str);
        await delay(cfg.bjMessageDelay);
        if (houseSum < 21) {
            const prize = bet * 2;
            user.add_money(prize);
            user.update_stats(true, prize, game_category.blackjack);
            user.state = user_state.none;
            user.bj.isDealingHand = false;
            const prizeStr = (bet * 2).toLocaleString('en-US');
            await msg.reply(
                `:black_joker: ${user.nickname} Fuck me, you won with a **natural blackjack**. Take your **${prizeStr}** ${boneSymbol}`
            );
            await msg.channel.send(`${GIFS.toCashFlowGif}`);
        } else if (houseSum == 21) {
            await msg.reply(
                `:black_joker: ${user.nickname} Sucks to be you, I just clutched it out and denied your blackjack. You keep your bet`
            );
            await msg.channel.send(`${GIFS.lossStreakGif}`);
            user.state = user_state.none;
            user.bj.isDealingHand = false;
        }
    } else {
        await msgRef.edit(msgRef.content + `\n` + `:black_joker: ${user.nickname}, Do you wish to **hit**, **stand** or **double** down?`);
        user.bj.bet = bet;
        user.bj.isDealingHand = false;
    }
}

async function blackjack_game_continue(user: user_account, msg: Discord.Message, option: string) {
    if (user.bj.round == 0) {
        msg.reply(`${user.nickname}, You aren't currently playing blackjack. Use !blackjack <bet> or !bj <bet> to start a game.`);
        return;
    }

    if (user.bj.isDealingHand) return;

    if (option === blackjack_option.resign) {
        const halfBet = Math.floor(user.bj.bet * 0.5);
        const prize = halfBet;
        user.add_money(prize);
        user.update_stats(false, prize, game_category.blackjack);
        msg.reply(`${user.nickname}, You chose to surrender and lose half your bet: **${halfBet}** ${boneSymbol}`);
        return;
    }

    user.bj.isDealingHand = true;
    const userCards = user.bj.userCards;
    const houseCards = user.bj.houseCards;
    const userSum = blackjack_sum_cards(userCards, userCards.length);

    let msgRef = null;

    if (option === blackjack_option.hit) {
        msgRef = await msg.reply(`${user.nickname}, chose to **hit**`);
        await delay(cfg.bjMessageDelay);
        userCards.push(deal_card(user, msg));
        const userSum = blackjack_sum_cards(userCards, userCards.length);
        if (userSum > 21) {
            let str = `${user.nickname}, You have ` + make_blackjack_hand_string(userCards, userCards.length, userSum);
            await msgRef.edit(msgRef.content + `\n` + str);
            await delay(cfg.bjMessageDelay);

            const houseSum = blackjack_sum_cards(houseCards, 2, 0);
            str = `${user.nickname}, I have ${cardSymbols[houseCards[0]]} ${cardSymbols[houseCards[1]]} = ${houseSum}`;
            await msgRef.edit(msgRef.content + `\n` + str);
            await delay(cfg.bjMessageDelay);

            const prize = -user.bj.bet;
            user.add_money(prize);
            user.update_stats(false, prize, game_category.blackjack);
            str = `:black_joker: ${user.nickname}, **OWH!** You **busted!** You lose **${user.bj.bet.toLocaleString(
                'en-US'
            )}** ${boneSymbol}`;
            await msg.reply(str);
            msg.channel.send(`${GIFS.youBustedGif}`);
            blackjack_game_end(user);
            return;
        } else {
            let str = `${user.nickname}, You have ` + make_blackjack_hand_string(userCards, userCards.length, userSum);
            await msgRef.edit(msgRef.content + `\n` + str);
            await delay(cfg.bjMessageDelay);
            if (userSum < 21) {
                const cardValue = cardValues[houseCards[0]];
                str = `${user.nickname}, I have ${cardSymbols[houseCards[0]]} ${hiddenCard} = ${cardValue} `;
                if (cardValues[houseCards[0]] === 1) {
                    str += 'or 11 ';
                }
                str += ' + ?';
                await msgRef.edit(msgRef.content + `\n` + str);
                await delay(cfg.bjMessageDelay);
            }

            if (userSum == 21) {
                await msgRef.edit(msgRef.content + `\n${user.nickname}, You have **blackjack** and automatically **stand**...`);
                user.bj.isDealingHand = false;
                await delay(cfg.bjMessageDelay);
                await blackjack_game_continue(user, msg, blackjack_option.stand);
                return;
            }
            await msgRef.edit(msgRef.content + `\n` + `${user.nickname}, Do you want to **hit** or **stand**`);
            user.bj.round++;
        }
    } else if (option === blackjack_option.doubleDown) {
        if (user.bones < user.bj.bet * 2) {
            await msg.reply(`${user.nickname}, you don't have enough bones to double down`);
            user.bj.isDealingHand = false;
            return;
        }
        if (user.bj.round > 1) {
            await msg.reply(`${user.nickname}, you can only double down on the first round`);
            user.bj.isDealingHand = false;
            return;
        }
        user.bj.bet *= 2;
        msgRef = await msg.reply(
            `${user.nickname}, you chose to **double down** and increase your bet to **${user.bj.bet.toLocaleString(
                'en-US'
            )}** ${boneSymbol}. You draw another card and **stand**`
        );
        await delay(cfg.bjMessageDelay);
        userCards.push(deal_card(user, msg));
        user.bj.isDealingHand = false;
        user.bj.round++;
        await blackjack_game_continue(user, msg, blackjack_option.stand);
        return;
    } else {
        user.bj.round++;
        msgRef = await msg.reply(`${user.nickname}, chose to **stand**`);
        await delay(cfg.bjMessageDelay);

        let str = `${user.nickname}, You have ` + make_blackjack_hand_string(userCards, userCards.length, userSum);

        await msgRef.edit(msgRef.content + `\n` + str);
        await delay(cfg.bjMessageDelay);

        let houseSum = blackjack_sum_cards(houseCards, 2);
        str = `${user.nickname}, Revealing my hand ` + make_blackjack_hand_string(houseCards, 2, houseSum);
        str += houseSum < 17 ? ` (dealer must hit)` : ` (dealer must stand)`;

        await msgRef.edit(msgRef.content + `\n` + str);
        await delay(cfg.bjMessageDelay);

        if (houseSum < 17) {
            while (true) {
                houseCards.push(deal_card(user, msg));
                houseSum = blackjack_sum_cards(houseCards, houseCards.length);
                str = `${user.nickname}, I hit and got ` + make_blackjack_hand_string(houseCards, houseCards.length, houseSum);
                str += houseSum < 17 ? ` (dealer must hit)` : ` (dealer must stand)`;
                await msgRef.edit(msgRef.content + `\n` + str);
                await delay(cfg.bjMessageDelay);
                if (houseSum >= 17) {
                    break;
                }
            }
        }

        let prize = 0;
        let won = true;
        if (userSum > 21) {
            prize = -user.bj.bet;
            str = `:black_joker: ${user.nickname}, **OWH!** You **busted!** You lose **${user.bj.bet.toLocaleString(
                'en-US'
            )}** ${boneSymbol}`;
            await msg.reply(str);
            msg.channel.send(`${GIFS.youBustedGif}`);
            blackjack_game_end(user);
            won = false;
        } else if (userSum == 21 && houseSum != 21) {
            prize = user.bj.bet * 2;
            won = true;
            const prizeStr = prize.toLocaleString('en-US');
            await msg.reply(`:black_joker: ${user.nickname}, **FUCK**, You won with **blackjack** and win **${prizeStr}** ${boneSymbol}`);
            msg.channel.send(`${GIFS.toCashFlowGif}`);
        } else if (houseSum > 21) {
            prize = user.bj.bet;
            won = true;

            await msg.reply(
                `:black_joker: ${user.nickname}, **FUCK**, I busted... You win **${user.bj.bet.toLocaleString('en-US')}** ${boneSymbol}`
            );
            msg.channel.send(`${GIFS.bustinMakesMeFeelGoodGif}`);
        } else if (userSum > houseSum) {
            prize = user.bj.bet;
            won = true;
            await msg.reply(`${user.nickname}, Your hand beats mine. You win **${user.bj.bet.toLocaleString('en-US')}** ${boneSymbol}`);
            msg.channel.send(`${GIFS.toCashFlowGif}`);
        } else if (userSum == houseSum) {
            await msg.reply(`${user.nickname}, It's a draw. You get your bet back ${EMOJIS.cringeEmoji}`);
        } else {
            prize = -user.bj.bet;
            won = false;
            await msg.reply(`${user.nickname}, My hand beats yours. You lose **${user.bj.bet.toLocaleString('en-US')}** ${boneSymbol}`);
            msg.channel.send(`${GIFS.youBustedGif}`);
        }
        blackjack_game_end(user);
        user.add_money(prize);
        user.update_stats(true, prize, game_category.blackjack);
    }
    user.bj.isDealingHand = false;
}

export { blackjack_game_data, blackjack_game, blackjack_game_continue, blackjack_option, blackjack_sum_cards };
