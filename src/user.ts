import { roulette_game_data } from './russian_roulette.js';
import { blackjack_game_data } from './blackjack.js';
import { game_category } from './utils.js';
import { bet_pool, race_horse } from './horse_racing.js';
import Discord from 'discord.js';

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
    nickname: string;
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
    constructor(
        username: string,
        userId: string,
        nickname: string,
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
        this.nickname = nickname;
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

    horseBeingSold: boolean;

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
    }
}
