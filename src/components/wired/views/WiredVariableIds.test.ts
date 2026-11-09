import { describe, expect, it } from 'vitest';
import { fromWiredVariableId, readWiredVariableToken, toWiredVariableId, toWiredVariableIdOnTarget, WIRED_VARIABLE_ID_NONE, wiredVariableIdList, wiredVariableIdTarget } from './WiredVariableIds';

describe('WiredVariableIds', () => {
    it('sends a box variable under the id the variable list gives it', () => {
        expect(toWiredVariableId('user', 'custom:12')).toBe('user:12');
        expect(toWiredVariableId('furni', 'custom:12')).toBe('furni:12');
        expect(toWiredVariableId('global', 'custom:12')).toBe('room:12');
        expect(toWiredVariableId('context', 'custom:12')).toBe('ctx:12');
        expect(toWiredVariableId('user', '')).toBe('');
    });

    it("sends a built-in under Habbo's id and ours under <target>:<key>", () => {
        expect(toWiredVariableId('furni', 'internal:@position')).toBe('-125');
        expect(toWiredVariableId('user', 'internal:@position_x')).toBe('-230');
        expect(toWiredVariableId('furni', 'internal:@position_x')).toBe('-120');
        expect(toWiredVariableId('furni', 'internal:~chest.capacity')).toBe('~133');
        expect(toWiredVariableId('context', 'internal:@antenna_id')).toBe('-420');
        expect(toWiredVariableId('global', 'internal:@team_red_score')).toBe('-320');
        expect(toWiredVariableId('furni', 'internal:@opacity')).toBe('furni:@opacity');
    });

    it('reads every id form back into the token', () => {
        expect(fromWiredVariableId('user:12')).toBe('custom:12');
        expect(fromWiredVariableId('ctx:7')).toBe('custom:7');
        expect(fromWiredVariableId('12')).toBe('custom:12');
        expect(fromWiredVariableId('custom:12')).toBe('custom:12');
        expect(fromWiredVariableId('-125')).toBe('internal:@position');
        expect(fromWiredVariableId('~133')).toBe('internal:~chest.capacity');
        expect(fromWiredVariableId('furni:@opacity')).toBe('internal:@opacity');
        expect(fromWiredVariableId('internal:@state')).toBe('internal:@state');
        expect(fromWiredVariableId(WIRED_VARIABLE_ID_NONE)).toBe('');
        expect(fromWiredVariableId('-99999')).toBe('');
        expect(fromWiredVariableId('')).toBe('');
    });

    it('names the target an id carries', () => {
        expect(wiredVariableIdTarget('furni:3')).toBe('furni');
        expect(wiredVariableIdTarget('room:3')).toBe('global');
        expect(wiredVariableIdTarget('-230')).toBe('user');
        expect(wiredVariableIdTarget('-400')).toBe('context');
        expect(wiredVariableIdTarget('3')).toBeNull();
    });

    it('falls back to the token an older server wrote', () => {
        expect(readWiredVariableToken(['user:4'], 0, 'custom:9')).toBe('custom:4');
        expect(readWiredVariableToken([], 0, 'custom:9')).toBe('custom:9');
        expect(readWiredVariableToken(undefined, 1)).toBe('');
    });

    it('keeps the slots of a list, with "n" for an empty one before a filled one', () => {
        expect(wiredVariableIdList('user:1', '')).toEqual(['user:1']);
        expect(wiredVariableIdList('', 'room:2')).toEqual(['n', 'room:2']);
        expect(wiredVariableIdList('', '')).toEqual([]);
    });
    it('names the new built-ins by Habbo id and a box on an official target by its list id', () => {
        expect(toWiredVariableId('furni', 'internal:~clock.pulse_count')).toBe('~121');
        expect(toWiredVariableId('user', 'internal:@habbicon')).toBe('-245');
        expect(toWiredVariableId('user', 'internal:~plant.can_harvest')).toBe('~611');
        expect(toWiredVariableId('context', 'internal:@event.transaction_complete.multiplier')).toBe('-470');
        expect(wiredVariableIdTarget('-284')).toBe('user');
        expect(toWiredVariableIdOnTarget(-10, 'custom:12')).toBe('room:12');
        expect(toWiredVariableIdOnTarget(-20, 'custom:12')).toBe('ctx:12');
        expect(toWiredVariableIdOnTarget(1, 'custom:12')).toBe('user:12');
    });
});
