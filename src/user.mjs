import { roulette_game_data } from './russian_roulette.mjs';
import { blackjack_game_data } from './blackjack.mjs';

export class user_account {
    constructor(username, userId, nickname, guildId, guildName, guildObj, numBones) {
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
    constructor(id) {
        this.id = id;
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
