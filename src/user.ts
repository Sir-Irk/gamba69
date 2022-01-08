import { roulette_game_data } from './russian_roulette.js';
import { blackjack_game_data } from './blackjack.js';

export class user_account {
    id: string;
    guild: string;
    guildName: string;
    guildObj: user_guild;
    name: string;
    nickname: string;
    bones: number;
    isPlayingGame: boolean;
    dailyCollectionTime: number;
    dailyStreak: number;
    charityCollectionTime: number;
    rl: roulette_game_data;
    bj: blackjack_game_data;
    workPaycheck: number;
    workStartTime: number;
    diceGamesPlayed: number;
    rlGamesPlayed: number;
    bjGamesPlayed: number;
    slotsGamesPlayed: number;
    diceGamesWon: number;
    rlGamesWon: number;
    bjGamesWon: number;
    slotsGamesWon: number;
    diceGamesBonesWon: number;
    rlGamesBonesWon: number;
    bjGamesBonesWon: number;
    slotsGamesBonesWon: number;
    constructor(
        username: string,
        userId: string,
        nickname: string,
        guildId: string,
        guildName: string,
        guildObj: user_guild,
        numBones: number
    ) {
        this.id = userId;
        this.guild = guildId;
        this.guildName = guildName;
        this.guildObj = guildObj;
        this.name = username;
        this.nickname = nickname;
        this.bones = numBones;
        this.isPlayingGame = false;
        this.dailyCollectionTime = 0;
        this.dailyStreak = 0;
        this.charityCollectionTime = 0;
        this.rl = new roulette_game_data();
        this.bj = new blackjack_game_data();
        this.workPaycheck = 0;
        this.workStartTime = 0;

        this.diceGamesPlayed = 0;
        this.rlGamesPlayed = 0;
        this.bjGamesPlayed = 0;
        this.slotsGamesPlayed = 0;

        this.diceGamesWon = 0;
        this.rlGamesWon = 0;
        this.bjGamesWon = 0;
        this.slotsGamesWon = 0;

        this.diceGamesBonesWon = 0;
        this.rlGamesBonesWon = 0;
        this.bjGamesBonesWon = 0;
        this.slotsGamesBonesWon = 0;
    }
}

export class user_guild {
    id: string;
    name: string;
    users: user_account[];
    houseBones: number;
    gamesPlayed: number;
    slotsGamesPlayed: number;
    diceGamesPlayed: number;
    bjGamesPlayed: number;
    rlGamesPlayed: number;
    diceGamesWon: number;
    rlGamesWon: number;
    bjGamesWon: number;
    slotsGamesWon: number;
    constructor(id: string) {
        this.id = id;
        this.name = null;
        this.users = [];
        this.houseBones = 0;
        this.gamesPlayed = 0;
        this.slotsGamesPlayed = 0;
        this.diceGamesPlayed = 0;
        this.bjGamesPlayed = 0;
        this.rlGamesPlayed = 0;
        this.diceGamesWon = 0;
        this.rlGamesWon = 0;
        this.bjGamesWon = 0;
        this.slotsGamesWon = 0;
    }
}
