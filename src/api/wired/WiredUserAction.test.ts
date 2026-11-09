import { describe, expect, it } from 'vitest';
import { readWiredUserAction, WIRED_USER_ACTIONS, wiredUserActionExtra } from './WiredUserAction';

describe('WiredUserAction', () =>
{
    it('lists the official action codes', () =>
    {
        expect(WIRED_USER_ACTIONS.map(action => action.code)).toEqual([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11 ]);
    });

    it('reads and writes the sign and dance extra as the official client does', () =>
    {
        const dance = readWiredUserAction([ 11 ], 'dance 3');

        expect(dance).toMatchObject({ action: 11, danceFilter: true, danceId: 3 });
        expect(wiredUserActionExtra(dance)).toBe('dance 3');
        expect(wiredUserActionExtra(readWiredUserAction([ 10 ], '7'))).toBe('7');
        expect(readWiredUserAction([ 10 ], '')).toMatchObject({ signFilter: false });
        expect(wiredUserActionExtra({ ...dance, danceFilter: false })).toBe('');
    });

    it('falls back to wave for an unknown action', () =>
    {
        expect(readWiredUserAction([ 99 ], '').action).toBe(0);
    });
});
