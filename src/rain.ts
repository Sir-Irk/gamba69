import { boneSymbol } from './symbols.js';
import { verify_bet, user_is_playing_game, shuffle, write_user_data_json } from './utils.js';
import Discord from 'discord.js';
import { user_account } from './user.js';

export function make_it_rain(users: user_account[], giver: user_account, amount: number, numUsers: number, msg: Discord.Message) {
    if (users.length == 0) return;
    if (!verify_bet(giver, amount, msg)) {
        return;
    }

    numUsers = Math.min(numUsers, users.length);
    let userArr = [];
    if (numUsers > 0 && numUsers < users.length) {
        let indexArr = [];
        for (let i = 0; i < users.length; ++i) {
            if (users[i].id !== giver.id) {
                indexArr.push(i);
            }
        }
        shuffle(indexArr);
        for (let i = 0; i < numUsers; ++i) {
            userArr.push(users[indexArr[i]]);
        }
    } else {
        numUsers = users.length;
        userArr = users;
    }

    const perUserAmount = Math.floor(amount / userArr.length);
    if (perUserAmount <= 0) {
        msg.reply(`Error: you'll need to enter at least ${userArr.length - 1} bones to make it rain`);
        return;
    }
    giver.bones -= amount;
    write_user_data_json(giver);
    //let str = '';

    const embed = new Discord.MessageEmbed()
        .setTitle(`${boneSymbol} :cloud_rain: ${giver.nickname} is making it rain :cloud_rain: ${boneSymbol}`)
        .setColor('#00AAFF');

    for (let i = 0; i < userArr.length; ++i) {
        let u = userArr[i];
        if (u.id == giver.id) continue;
        u.bones += perUserAmount;
        //str += `**${u.nickname}**\n`;
        embed.addFields({
            name: `**${u.nickname}**`,
            value: `You receive **${perUserAmount.toLocaleString('en-US')}** ${boneSymbol}`,
            inline: false,
        });
        write_user_data_json(u);
    }
    msg.channel.send({ embeds: [embed] });
}
