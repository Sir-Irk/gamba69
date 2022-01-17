import { cfg } from './bot_cfg';
import { minInMili, hourInMili } from './constants';
import { GIFS, EMOJIS } from './media';
import { boneSymbol } from './symbols';
import { user_account } from './user';
import { user_is_playing_game } from './utils';
import * as Discord from 'discord.js';

export async function start_working(user: user_account, msg: Discord.Message<boolean>) {
    const timeSpent = Date.now() - user.workStartTime;
    if (user.workPaycheck > 0 && timeSpent < cfg.workDuration) {
        const timeLeft = cfg.workDuration - timeSpent;
        const minutes = Math.floor((timeLeft * 0.001) / 60);
        const minutesInMili = minutes * minInMili;
        const secondsLeft = Math.round((timeLeft - minutesInMili) * 0.001);
        await msg.reply(
            `You are already working. Come back in **${minutes}m ${secondsLeft}s** to claim your paycheck of **${user.workPaycheck.toLocaleString(
                'en-US'
            )}** ${boneSymbol} and start working again`
        );
    } else if (user.workPaycheck > 0 && timeSpent >= cfg.workDuration) {
        user.add_money(user.workPaycheck);
        user.guildObj.houseBones -= user.workPaycheck;
        const range = cfg.workSalaryMax - cfg.workSalaryMin;
        const paycheck = Math.floor(cfg.workSalaryMin + (Math.random() + 1) * range);
        user.workStartTime = Date.now();
        await msg.reply(
            `${user.nickname}, Here is your paycheck of **${user.workPaycheck.toLocaleString(
                'en-US'
            )}** ${boneSymbol} , come back in an hour to claim your paycheck of **${paycheck.toLocaleString('en-US')}** ${boneSymbol}`
        );
        msg.channel.send(`${GIFS.toCashFlowGif}`);
        user.workPaycheck = paycheck;
    } else if (user.workPaycheck == 0) {
        const range = cfg.workSalaryMax - cfg.workSalaryMin;
        user.workPaycheck = Math.round(cfg.workSalaryMin + (Math.random() + 1) * range);
        user.workStartTime = Date.now();
        await msg.reply(
            `${user.nickname}, You started working. Your paycheck will be **${user.workPaycheck.toLocaleString(
                'en-US'
            )}** ${boneSymbol} , come back in an hour to claim it and start working again`
        );
    }
}

export async function daily_bones(user: user_account, msg: Discord.Message<boolean>) {
    const timeSinceLastDaily = Date.now() - user.dailyCollectionTime;
    if (user.dailyCollectionTime == 0 || timeSinceLastDaily >= cfg.dailyCollectionInterval) {
        const mul = Math.min(7, user.dailyStreak + 1);
        user.add_money(cfg.dailyBonus * mul);
        user.guildObj.houseBones -= cfg.dailyBonus * mul;
        const dailyBonesStr = (cfg.dailyBonus * mul).toLocaleString('en-US');
        if (user.dailyStreak > 0) {
            msg.reply(
                `${EMOJIS.imBigEmoji} You have collected your daily bonus of **${dailyBonesStr}** ${boneSymbol} , you earned **${mul}x** from your streak bonus!`
            );
        } else {
            msg.reply(`${EMOJIS.imBigEmoji} You have collected your daily bonus of **${dailyBonesStr}** ${boneSymbol}`);
        }
        user.dailyStreak++;
        user.dailyCollectionTime = Date.now();
    } else {
        const timeLeft = cfg.dailyCollectionInterval - timeSinceLastDaily;
        const hours = Math.floor((timeLeft * 0.001) / 60 / 60);
        const hoursInMili = hours * hourInMili;
        const minutes = Math.round(((timeLeft - hoursInMili) * 0.001) / 60);
        msg.reply(`${user.nickname}, You need to wait **${hours}h** **${minutes}m** before collecting your daily bonus again`);
    }
}
