import { cfg } from './bot_cfg';
import { get_stock_price } from './finnhub';
import { user_account, user_guild } from './user';
import { delay } from './utils';

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
        const diff = this.pricePerShare - this.averageCostPerShare;
        return (diff / this.averageCostPerShare) * 100;
    }
}

export async function update_user_stock_prices(userGuilds: user_guild[]) {
    while (true) {
        console.time('User stock update');
        for (let guildIdx = 0; guildIdx < userGuilds.length; ++guildIdx) {
            let users = userGuilds[guildIdx].users;
            for (let userIdx = 0; userIdx < users.length; ++userIdx) {
                for (let i = 0; i < users[userIdx].stocks.length; ++i) {
                    let s = users[userIdx].stocks[i];
                    const data = await get_stock_price(s.ticker);
                    if (data) {
                        s.pricePerShare = data.c;
                    }
                }
            }
        }
        console.timeEnd('User stock update');
        await delay(cfg.userStockUpdateInterval);
    }
}
