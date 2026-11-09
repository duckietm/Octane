import { describe, expect, it } from 'vitest';
import {
    decodeLeaderboardConfig,
    defaultLeaderboardConfig,
    encodeLeaderboardConfig,
    formatLeaderboardTime,
    leaderboardGlobalVariableId,
    leaderboardUserVariableId,
    formatLeaderboardValue,
    ILeaderboardConfig,
    isCanonicalLeaderboardLiteral,
    leaderboardDesiredChunks,
    leaderboardPanelWidth,
    OPERAND_GLOBAL_VARIABLE,
    suggestLeaderboardName,
    validateLeaderboardConfig
} from './WiredLeaderboard';

const sample = (): ILeaderboardConfig => ({
    ...defaultLeaderboardConfig(5, 6),
    title: 'Top players',
    description: 'This week',
    pageSizeOption: 2,
    columns: [ { type: 0, label: 'Player', width: 3 }, { type: 1, label: 'Score', width: 0 }, { type: 4, label: 'Lvl', width: 0 } ],
    filterEnabled: true,
    compareEnabled: true,
    filterVariableId: 'user:77',
    comparisonLiteral: '-12',
    displayOverrides: { 'user:812': 'Coins', 'user:1200': 'Wins' },
    offsetX: -10,
    altitude: 40
});

describe('WiredLeaderboard codec', () =>
{
    it('writes the official layout, the variable list ids apart from the text, and reads it back', () =>
    {
        const { intParams, stringParam, variableIds } = encodeLeaderboardConfig(sample());
        const fields = stringParam.split('\t');

        expect(intParams).toHaveLength(19);
        expect(fields).toHaveLength(17);
        expect(variableIds).toHaveLength(12);
        expect(intParams.slice(0, 10)).toEqual([ 0, 3, 0, 1, 4, -1, 1, 1, 0, 2 ]);
        // Overrides are sorted by plain string order: "user:1200" before "user:812".
        expect(variableIds.slice(0, 4)).toEqual([ 'user:77', '0', 'user:1200', 'user:812' ]);
        expect(fields[7]).toBe('Wins');
        expect(decodeLeaderboardConfig(intParams, stringParam, 0, 0, variableIds)).toEqual(sample());
    });

    it('reads what an older server sent: bare ids after the text fields', () =>
    {
        const { intParams, stringParam } = encodeLeaderboardConfig(sample());
        const old = [ ...stringParam.split('\t'), '77', '0', '1200', '812', '0', '0', '0', '0', '0', '0', '0', '0' ].join('\t');

        expect(decodeLeaderboardConfig(intParams, old, 0, 0)).toEqual(sample());
    });

    it('reads bare ids, tokens and trimmed lists as the same variables', () =>
    {
        const { intParams, stringParam } = encodeLeaderboardConfig(sample());

        expect(decodeLeaderboardConfig(intParams, stringParam, 0, 0, [ 'custom:77', 'n', '1200', 'user:812' ])).toEqual(sample());
        expect(leaderboardUserVariableId('12')).toBe('user:12');
        expect(leaderboardUserVariableId('custom:12')).toBe('user:12');
        expect(leaderboardUserVariableId('n')).toBe('0');
        expect(leaderboardUserVariableId('furni:12')).toBe('furni:12');
        expect(leaderboardUserVariableId('-234')).toBe('-234');
        expect(leaderboardGlobalVariableId('5')).toBe('room:5');
        // A config holding a bare id (an older draft) still saves the list id.
        expect(encodeLeaderboardConfig({ ...sample(), filterVariableId: '77', displayOverrides: { '812': 'Coins' } }).variableIds.slice(0, 3)).toEqual([ 'user:77', '0', 'user:812' ]);
    });

    it('clears what a disabled option does not use', () =>
    {
        const { intParams, stringParam, variableIds } = encodeLeaderboardConfig({ ...sample(), filterEnabled: false });
        const fields = stringParam.split('\t');

        expect(intParams[6]).toBe(0);
        expect(intParams[7]).toBe(0);
        expect(fields[6]).toBe('');
        expect(variableIds[0]).toBe('0');
    });

    it('reads an unconfigured box as the defaults at its tile', () =>
    {
        expect(decodeLeaderboardConfig([], '', 3, 4)).toEqual(defaultLeaderboardConfig(3, 4));
    });
});

describe('WiredLeaderboard validation', () =>
{
    it('reports the official errors', () =>
    {
        expect(validateLeaderboardConfig(sample())).toBeNull();
        expect(validateLeaderboardConfig({ ...sample(), title: ' ' })).toBe('wiredfurni.error.variable_leaderboard.title_required');
        expect(validateLeaderboardConfig({ ...sample(), columns: [ { type: 0, label: 'P', width: 3 } ] })).toBe('wiredfurni.error.variable_leaderboard.column_name_length');
        expect(validateLeaderboardConfig({ ...sample(), filterVariableId: '0' })).toBe('wiredfurni.error.variable_leaderboard.filter_required');
        expect(validateLeaderboardConfig({ ...sample(), operandKind: OPERAND_GLOBAL_VARIABLE })).toBe('wiredfurni.error.variable_leaderboard.global_operand_required');
        expect(validateLeaderboardConfig({ ...sample(), comparisonLiteral: '007' })).toBe('wiredfurni.error.variable_leaderboard.invalid_configuration');
        expect(validateLeaderboardConfig({ ...sample(), columns: [ { type: 0, label: 'Player', width: 3 }, { type: 0, label: 'Again', width: 0 } ] })).toBe('wiredfurni.error.variable_leaderboard.invalid_configuration');
    });

    it('accepts only canonical 64-bit literals', () =>
    {
        expect(isCanonicalLeaderboardLiteral('9223372036854775807')).toBe(true);
        expect(isCanonicalLeaderboardLiteral('9223372036854775808')).toBe(false);
        expect(isCanonicalLeaderboardLiteral('-0')).toBe(false);
        expect(isCanonicalLeaderboardLiteral('0')).toBe(true);
    });
});

describe('WiredLeaderboard formatting', () =>
{
    it('suggests names like the client', () =>
    {
        expect(suggestLeaderboardName('coins_won')).toBe('Coins Won');
        expect(suggestLeaderboardName('BEST--lap_time')).toBe('Best Lap Time');
        expect(suggestLeaderboardName('__')).toBe('Variable');
    });

    it('groups thousands of plain integers only', () =>
    {
        expect(formatLeaderboardValue('-1234567')).toBe('-1,234,567');
        expect(formatLeaderboardValue('999')).toBe('999');
        expect(formatLeaderboardValue('12.5')).toBe('12.5');
        expect(formatLeaderboardValue('')).toBe('');
    });

    it('formats times relative to now', () =>
    {
        const now = new Date(2026, 9, 13, 15, 30).getTime();
        const ago = (minutes: number) => `${ minutes }m ago`;
        const month = (index: number) => [ '', 'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.' ][index];

        expect(formatLeaderboardTime(0, now, ago, month)).toBe('-');
        expect(formatLeaderboardTime(now - 10000, now, ago, month)).toBe('1m ago');
        expect(formatLeaderboardTime(new Date(2026, 9, 13, 9, 5).getTime(), now, ago, month)).toBe('09:05');
        expect(formatLeaderboardTime(new Date(2026, 1, 3).getTime(), now, ago, month)).toBe('Feb 3');
        expect(formatLeaderboardTime(new Date(2025, 11, 24).getTime(), now, ago, month)).toBe('Dec 24, 2025');
    });

    it('sizes the panel from its columns', () =>
    {
        expect(leaderboardPanelWidth([ { width: 0 } ])).toBe(250);
        expect(leaderboardPanelWidth([ { width: 3 }, { width: 2 }, { width: 1 } ])).toBe(38 + 170 + 120 + 90 + 16);
    });
});

describe('WiredLeaderboard paging', () =>
{
    it('asks for the chunks a page needs', () =>
    {
        expect(leaderboardDesiredChunks(0, 10, null, false)).toEqual([ 0 ]);
        expect(leaderboardDesiredChunks(40, 20, 200, false)).toEqual([ 0, 1 ]);
        expect(leaderboardDesiredChunks(30, 10, 200, true)).toEqual([ 0, 1 ]);
        expect(leaderboardDesiredChunks(10, 10, 200, true)).toEqual([ 0 ]);
        expect(leaderboardDesiredChunks(40, 20, 45, false)).toEqual([ 0 ]);
    });
});
