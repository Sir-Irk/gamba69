import { roulette_game_data } from './russian_roulette';
import { blackjack_game_data } from './blackjack';
import { game_category } from './utils';
import { bet_pool, race_horse } from './horse_racing';
import { cfg } from './bot_cfg';
import { assert } from 'chai';
import { stock_position } from './stocks';
import * as Discord from 'discord.js';

export class game_stats {
    played: number;
    wins: number;
    moneyWon: number;
    type: game_category;
    constructor(type: game_category, played: number = 0, won: number = 0, moneyWon: number = 0) {
        this.type = type;
        this.played = played;
        this.wins = won;
        this.moneyWon = moneyWon;
    }
}

export enum user_state {
    none,
    playingGame,
    horseRacing,
    horseRaceBetting,
    buyingHorse,
    sellingHorse,
    namingHorse,
    renamingHorse,
}
export class user_account {
    id: string;
    guild: string;
    guildName: string;
    guildObj: user_guild;
    name: string;
    _nickname: string;
    bones: number;

    state: user_state;

    dailyCollectionTime: number;
    dailyStreak: number;
    charityCollectionTime: number;
    rl: roulette_game_data;
    bj: blackjack_game_data;
    workPaycheck: number;
    workStartTime: number;
    highestBones: number;
    numHorsesOwned: number = 0;
    horseToSell: race_horse = null;
    gameStats: game_stats[];
    horseBeingRenamed: race_horse;
    stocks: stock_position[];

    autoSlots?: boolean;
    lastSlotsGameTime: number;
    showGameGifs: boolean = true;
    constructor(
        username: string,
        userId: string,
        _nickname: string,
        guildId: string,
        guildName: string,
        guildObj: user_guild,
        numBones: number
    ) {
        this.state = user_state.none;
        this.id = userId;
        this.guild = guildId;
        this.guildName = guildName;
        this.guildObj = guildObj;
        this.name = username;
        this.bones = numBones;
        this.highestBones = 0;
        this.dailyCollectionTime = 0;
        this.dailyStreak = 0;
        this.charityCollectionTime = 0;
        this.rl = new roulette_game_data();
        this.bj = new blackjack_game_data();
        this.workPaycheck = 0;
        this.workStartTime = 0;
        this.numHorsesOwned = 0;
        this._nickname = null;
        this.stocks = [];
        this.lastSlotsGameTime = 0;
    }

    public get_net_worth_in_stock() {
        let sum = 0;
        for (let i = 0; i < this.stocks.length; ++i) {
            sum += this.stocks[i].get_position_size();
        }
        return sum;
    }

    public add_stock_position(pos: stock_position): void {
        for (let i = 0; i < this.stocks.length; ++i) {
            let s = this.stocks[i];
            if (s.ticker === pos.ticker) {
                if (s.short === pos.short) {
                    let avgPrice = (s.averageCostPerShare + pos.pricePerShare) / 2;
                    s.numShares = s.numShares + pos.numShares;
                    s.averageCostPerShare = avgPrice;
                    return;
                } else {
                    throw new Error(
                        `Position type(short/long) must match your current position type: ${s.ticker} ${s.short ? '**short**' : '**long**'}`
                    );
                }
            }
        }

        if (this.stocks.length >= cfg.maxStockPositions) {
            throw new Error(`You already hold the maximum number of stock/crypto positions`);
        }
        this.stocks.push(pos);
    }

    set nickname(name: string) {
        this._nickname = name;
    }
    get nickname() {
        if (!this._nickname) {
            this._nickname = this.name;
        }
        return this._nickname;
    }

    public add_money(amount: number) {
        this.bones += amount;
        this.highestBones = Math.max(this.bones, this.highestBones);
        this.guildObj.houseBones -= amount;
    }

    public update_stats(won: boolean, prize: number, type: game_category) {
        let s = this.gameStats[type];
        s.played++;
        s.wins += won ? 1 : 0;
        s.moneyWon += prize;
    }
}

export class user_guild {
    id: string;
    name: string;
    users: user_account[];
    houseBones: number;

    //TODO: Pull the horse race stuff out into a class
    userRunningHorseBet: user_account;
    horseRaceIsTakingBets: boolean;
    horseRaceIsActive: boolean;
    horseRaceBetPool: bet_pool;
    horseRaceBetStartTime: number;
    horseRaceBetTimeoutCoroutine: any;
    horseTrackLen: number;
    horses: race_horse[];
    horseGraveyard: race_horse[];
    horseOwners: user_account[];
    horsesInRace: race_horse[];
    horsesInQueue: race_horse[];
    horseBeingSold: boolean;

    slotsResultsChannel: Discord.DMChannel = null;

    constructor(id: string) {
        this.id = id;
        this.name = null;
        this.users = [];
        this.houseBones = 0;
        this.horseRaceIsActive = false;
        this.horseRaceIsTakingBets = false;
        this.horseRaceBetPool = new bet_pool();
        this.horseRaceBetStartTime = 0;
        this.horseTrackLen = 65;
        this.horses = [];
        this.horseGraveyard = [];
        this.horsesInRace = [];
        this.horsesInQueue = [];
    }
}
