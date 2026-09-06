import { describe, expect, it } from 'vitest';
import { getSanctionAgeColor, getUserInfoButtonState } from './ModToolsUserInfoFormat';

describe('getSanctionAgeColor', () => {
    it('is fully red for a sanction given just now', () => {
        expect(getSanctionAgeColor(0)).toBe('rgb(255, 0, 0)');
    });

    it('fades halfway to black after a day, truncating like the official integer maths', () => {
        expect(getSanctionAgeColor(24)).toBe('rgb(127, 0, 0)');
    });

    it('reaches black exactly at 48 hours', () => {
        expect(getSanctionAgeColor(48)).toBe('rgb(0, 0, 0)');
    });

    it('leaves the default colour alone once the sanction is older than 48 hours', () => {
        expect(getSanctionAgeColor(49)).toBeNull();
        expect(getSanctionAgeColor(Number.NaN)).toBeNull();
    });
});

describe('getUserInfoButtonState', () => {
    it('enables nothing before the init message has arrived', () => {
        expect(getUserInfoButtonState(null, 'a@b.c')).toEqual({ chatlog: false, message: false, modAction: false });
    });

    it('ties each button to the right the official client checks', () => {
        expect(getUserInfoButtonState({ chatlogsPermission: true, alertPermission: false, kickPermission: false, banPermission: false }, 'a@b.c')).toEqual({
            chatlog: true,
            message: false,
            modAction: false
        });
        expect(getUserInfoButtonState({ chatlogsPermission: false, alertPermission: true }, 'a@b.c')).toEqual({
            chatlog: false,
            message: true,
            modAction: true
        });
        expect(getUserInfoButtonState({ kickPermission: true }, 'a@b.c').modAction).toBe(true);
        expect(getUserInfoButtonState({ banPermission: true }, 'a@b.c').modAction).toBe(true);
    });

    it('never offers mod actions on an account without an identity', () => {
        expect(getUserInfoButtonState({ alertPermission: true, kickPermission: true, banPermission: true }, 'No identity').modAction).toBe(false);
    });
});
