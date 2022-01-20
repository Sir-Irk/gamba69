import { verify_bet } from '../src/utils';
import { user_account, user_guild } from '../src/user';
import * as Discord from 'discord.js';
const { Client } = Discord;

const guild = new user_guild('Test Guild Id');
const user = new user_account('Test Name', '69420', 'Test Nickname', guild.id, 'Test Guild Name', guild, 69);

describe('Testing bet verification', () => {
    expect(verify_bet(user, user.bones + 1, null)).toEqual(false);
});
