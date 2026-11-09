import { describe, expect, it } from 'vitest';
import { WiredTriggerLayout } from './WiredTriggerLayoutCode';

// The official AIR client's TriggerConfCodes (build WIN63-202610131318).
const OFFICIAL: Record<string, number> = {
    AVATAR_SAYS_SOMETHING: 0,
    AVATAR_WALKS_ON_FURNI: 1,
    AVATAR_WALKS_OFF_FURNI: 2,
    EXECUTE_ONCE: 3,
    TOGGLE_FURNI: 4,
    EXECUTE_PERIODICALLY: 6,
    AVATAR_ENTERS_ROOM: 7,
    GAME_STARTS: 8,
    GAME_ENDS: 9,
    SCORE_ACHIEVED: 10,
    COLLISION: 11,
    EXECUTE_PERIODICALLY_LONG: 12,
    BOT_REACHED_STUFF: 13,
    BOT_REACHED_AVATAR: 14,
    CLOCK_COUNTER: 15,
    USER_PERFORMS_ACTION: 16,
    RECEIVE_SIGNAL: 17,
    CLICK_FURNI: 18,
    EXECUTE_PERIODICALLY_SHORT: 19,
    STATE_CHANGE: 20,
    CLICK_TILE: 21,
    VARIABLE_CHANGED: 22,
    AVATAR_LEAVES_ROOM: 23,
    CLICK_USER: 24,
    TRANSACTION_COMPLETE: 25,
    TRANSACTION_FAIL: 26,
    ROOM_INITIALIZED: 28,
    RECEIVE_LINK_MESSAGE: 29,
    RECEIVE_LINK_DATAFRAME: 30
};

describe('wired trigger codes', () =>
{
    it('match the official client', () =>
    {
        for(const [ name, code ] of Object.entries(OFFICIAL)) expect([ name, (WiredTriggerLayout as any)[name] ]).toEqual([ name, code ]);
    });

    it('keep triggers the official client does not have at 1000 and up', () =>
    {
        const official = new Set(Object.keys(OFFICIAL));
        const custom = Object.entries(WiredTriggerLayout).filter(([ name ]) => !official.has(name));

        for(const [ name, code ] of custom) expect([ name, code >= 1000 ]).toEqual([ name, true ]);
    });
});
