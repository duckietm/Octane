import { describe, expect, it } from 'vitest';
import { WiredActionLayoutCode } from './WiredActionLayoutCode';

// The official AIR client's ActionTypeCodes (build WIN63-202610131318), for the actions we have.
const OFFICIAL: Record<string, number> = {
    TOGGLE_FURNI_STATE: 0, RESET: 1, SET_FURNI_STATE: 3, MOVE_FURNI: 4, GIVE_SCORE: 6, CHAT: 7, TELEPORT: 8, JOIN_TEAM: 9,
    LEAVE_TEAM: 10, CHASE: 11, FLEE: 12, MOVE_AND_ROTATE_FURNI: 13, GIVE_SCORE_TO_PREDEFINED_TEAM: 14, TOGGLE_TO_RANDOM_STATE: 15,
    MOVE_FURNI_TO: 16, GIVE_REWARD: 17, CALL_ANOTHER_STACK: 18, KICK_FROM_ROOM: 19, MUTE_USER: 20, BOT_TELEPORT: 21, BOT_MOVE: 22,
    BOT_TALK: 23, BOT_GIVE_HAND_ITEM: 24, BOT_FOLLOW_AVATAR: 25, BOT_CHANGE_FIGURE: 26, BOT_TALK_DIRECT_TO_AVTR: 27,
    CONTROL_CLOCK: 28, SET_ALTITUDE: 29, SEND_SIGNAL: 30, FREEZE: 31, UNFREEZE: 32, RELATIVE_MOVE: 33, FURNI_TO_FURNI: 34,
    FURNI_TO_USER: 35, NEG_CALL_ANOTHER_STACK: 36, NEG_SEND_SIGNAL: 37, ADJUST_CLOCK: 38, GIVE_VARIABLE: 39, REMOVE_VARIABLE: 40,
    CHANGE_VARIABLE_VALUE: 41, MOVE_ROTATE_USER: 42, USER_TO_FURNI: 43, TELEPORT_TO_ROOM: 44, GIVE_CURRENCY_FROM_CHEST: 45,
    GIVE_FURNI_FROM_CHEST: 46, INIT_TRANSACTION: 47, CANCEL_TRANSACTION: 48, WRITE_TO_LOGS: 49, WRITE_TO_LOGS_NEGATIVE: 50, PROGRESS_ACHIEVEMENT: 51,
    EFFECT_ID: 52, OVERRIDE_HEIGHT: 53, CLICK_SETTINGS: 54, PLACE_FURNI: 55, REMOVE_FURNI: 56, MOVE_FURNI_AS_GROUP: 57,
    PROGRESS_REWARD_TRACK: 58, RESET_REWARD_TRACK: 59, CHANGE_OPACITY: 61, SET_FURNI_HIGHLIGHT: 62, SEND_LINK_MESSAGE: 63, SEND_LINK_DATAFRAME: 64
};

describe('WiredActionLayoutCode', () =>
{
    it('uses the official action codes', () =>
    {
        for(const [ name, code ] of Object.entries(OFFICIAL)) expect((WiredActionLayoutCode as unknown as Record<string, number>)[name], name).toBe(code);
    });

    it('keeps our own actions at 1000 and up, every code once', () =>
    {
        const codes = Object.values(WiredActionLayoutCode as unknown as Record<string, number>);

        expect(codes.filter(code => !Object.values(OFFICIAL).includes(code)).every(code => code >= 1000)).toBe(true);
        expect(new Set(codes).size).toBe(codes.length);
    });
});
