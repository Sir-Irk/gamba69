import { dayInMili, hourInMili, minInMili } from './constants';
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
    cockBasePrice: number;
    maxHorsesPerUser: number;
    maxHorseBets: number;
    horseRaceBetTimeoutDuration: number;
    horseRaceCommissionRate: number;
    horseAgeProgressionPerRace: number;
    maxHorseNameLength: number;
    maxHorseRacesToRename: number;
    numHorsesPerRace: number;
    horseRetirementAge: number;
    slotsGifsEnabled: boolean;
    maxStockPositions: number;
    userStockUpdateInterval: number;
    constructor() {
        this.dailyBonus = 5000;
        this.dailyCollectionInterval = dayInMili;
        this.rouletteContinueTimeout = minInMili * 0.5;
        this.workDuration = hourInMili;
        this.workSalaryMin = 5000;
        this.workSalaryMax = 10000;
        this.charityCollectionInterval = 5 * minInMili;
        this.charityAmountInBones = 69;
        this.globalSlotPointsModifier = 1.0;
        this.bjMessageDelay = 1000;
        this.slotsMessageDelay = 1500;
        this.horseBasePrice = 100000;
        this.maxHorsesPerUser = 3;
        this.maxHorseBets = 2;
        this.horseRaceBetTimeoutDuration = 5 * minInMili;
        this.horseRaceCommissionRate = 0.05;
        this.maxHorseNameLength = 64;
        this.maxHorseRacesToRename = 3;
        this.cockBasePrice = 5000000;
        this.numHorsesPerRace = 6;
        this.horseAgeProgressionPerRace = 0.1;
        this.horseRetirementAge = 23;
        this.slotsGifsEnabled = true;
        this.maxStockPositions = 3;
        this.userStockUpdateInterval = minInMili * 3;
    }
}

export const cfg = new bot_cfg();
