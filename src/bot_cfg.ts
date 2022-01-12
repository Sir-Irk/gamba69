import { dayInMili, hourInMili, minInMili } from './constants.js';
export class bot_cfg {
    dailyBonus: number;
    dailyCollectionInterval: number;
    rouletteContinueTimeout: number;
    workDuration: number;
    workSalaryMin: number;
    workSalaryMax: number;
    charityCollectionInterval: number;
    charityAmountInBones: number;
    globalSlotPointsModifier: number;
    slotsMessageDelay: number;
    bjMessageDelay: number;
    horseBasePrice: number;
    maxHorsesPerUser: number;
    maxHorseBets: number;
    horseRaceBetTimeoutDuration: number;
    horseRaceCommissionRate: number;
    maxHorseNameLength: number;
    constructor() {
        this.dailyBonus = 2500;
        this.dailyCollectionInterval = dayInMili;
        this.rouletteContinueTimeout = minInMili * 0.5;
        this.workDuration = hourInMili;
        this.workSalaryMin = 2500;
        this.workSalaryMax = 5000;
        this.charityCollectionInterval = 5 * minInMili;
        this.charityAmountInBones = 69;
        this.globalSlotPointsModifier = 1.0;
        this.bjMessageDelay = 1000;
        this.slotsMessageDelay = 1500;
        this.horseBasePrice = 100000000;
        this.maxHorsesPerUser = 3;
        this.maxHorseBets = 2;
        this.horseRaceBetTimeoutDuration = 5 * minInMili;
        this.horseRaceCommissionRate = 0.05;
        this.maxHorseNameLength = 64;
    }
}

export const cfg = new bot_cfg();
