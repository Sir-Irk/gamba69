import { DiscordAPIError } from 'discord.js';
import { cfg } from './bot_cfg';
import { get_stock_price } from './finnhub';
import { user_account, user_guild } from './user';
import { delay, parse_bet, prefix, print_richest_list, user_is_playing_game, write_user_data_json } from './utils';
import * as Discord from 'discord.js';
import { boneSymbol } from './symbols';

export class stock_position {
    ticker: string;
    averageCostPerShare: number;
    pricePerShare: number;
    numShares: number;
    short: boolean;

    constructor(ticker: string, short: boolean, avgPrice: number, pricePerShare: number, numShares: number) {
        this.ticker = ticker;
        this.short = short;
        this.averageCostPerShare = avgPrice;
        this.pricePerShare = pricePerShare;
        this.numShares = numShares;
    }

    public position_size() {
        if (this.short) {
            return this.averageCostPerShare * this.numShares + this.get_profit();
        } else {
            return this.pricePerShare * this.numShares;
        }
    }

    public get_price_difference() {
        return this.pricePerShare - this.averageCostPerShare;
    }

    public get_investment() {
        return this.averageCostPerShare * this.numShares;
    }

    public get_profit() {
        const profit = this.pricePerShare * this.numShares - this.get_investment();
        return this.short ? -profit : profit;
    }

    public get_profit_percentage() {
        const percent = (this.get_price_difference() / this.averageCostPerShare) * 100;
        return this.short ? -percent : percent;
    }
}

async function update_stock_callback(user: user_account, stock: stock_position, priceData: any) {
    if (priceData && priceData.c !== 0) {
        stock.pricePerShare = priceData.c;
        console.log(`User ${user.name} stock ${stock.ticker} updated`);
    }
}

export async function update_user_stock_prices(userGuilds: user_guild[]) {
    while (true) {
        console.time('User stock update');
        const prices = [];

        for (let guildIdx = 0; guildIdx < userGuilds.length; ++guildIdx) {
            let users = userGuilds[guildIdx].users;

            for (let userIdx = 0; userIdx < users.length; ++userIdx) {
                let u = users[userIdx];

                for (let i = 0; i < u.stocks.length; ++i) {
                    let s = u.stocks[i];
                    get_stock_price(s.ticker).then((r) => {
                        update_stock_callback(u, s, r);
                    });
                }
            }
        }
        console.timeEnd('User stock update');
        await delay(cfg.userStockUpdateInterval);
    }
}
export async function invest_in_stock(user: user_account, args: string[], short: boolean, msg: Discord.Message) {
    if (user_is_playing_game(user, msg)) return;
    if (args.length < 2) {
        await msg.reply(
            `Usage: ${prefix}long/short <ticker symbol> <amount of bones>\nExample: ${prefix}long amc 5000\nUse -USD at the end of crypto tickers. For example BTC-USD`
        );
        return;
    }

    const ticker = args[0].toUpperCase();
    const amount = parse_bet(user, args[1], msg);
    if (amount > 0) {
        const data = await get_stock_price(ticker);
        if (data.c && data.c > 0) {
            const shares = amount / data.c;
            const position = new stock_position(ticker, short, data.c, data.c, shares);
            try {
                user.add_stock_position(position);
                user.add_money(-position.position_size());
                await msg.reply(
                    `You went ${short ? 'short' : 'long'} on ${shares.toLocaleString(
                        'en-US'
                    )} shares of ${ticker} @ ${data.c.toLocaleString('en-US')} per share for a total of ${amount.toLocaleString(
                        'en-US'
                    )} ${boneSymbol}`
                );
                write_user_data_json(user);
            } catch (error) {
                await msg.reply(error.toString());
            }
        } else {
            await msg.reply(`Failed to find stock or crypto "${args[0]}"`);
        }
    }
}
