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
        this.horseBasePrice = 1000000;
        this.maxHorsesPerUser = 3;
    }
}

export const cfg = new bot_cfg();
