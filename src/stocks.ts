import { cfg } from './bot_cfg';
import { get_stock_price } from './finnhub';
import { user_account, user_guild } from './user';
import { delay, print_richest_list } from './utils';

export class stock_position {
    ticker: string;
    averageCostPerShare: number;
    pricePerShare: number;
    numShares: number;

    constructor(ticker: string, price: number, numShares: number) {
        this.ticker = ticker;
        this.averageCostPerShare = price;
        this.pricePerShare = price;
        this.numShares = numShares;
    }

    public position_size() {
        return this.pricePerShare * this.numShares;
    }

    public get_profit() {
        return this.pricePerShare - this.averageCostPerShare;
    }

    public get_profit_percentage() {
        return (this.get_profit() / this.averageCostPerShare) * 100;
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
