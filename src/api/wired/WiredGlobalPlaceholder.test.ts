import { describe, expect, it } from 'vitest';
import { normalizeDailyTaskName } from './WiredDailyTask';
import {
    GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM,
    GLOBAL_PLACEHOLDER_FROM_VALUE,
    isGlobalPlaceholderValid,
    parseGlobalPlaceholder,
    selectGlobalPlaceholderSource,
    serializeGlobalPlaceholder
} from './WiredGlobalPlaceholder';

const SHARED = JSON.stringify({ rooms: [{ roomId: 12, roomName: 'Lobby', placeholders: ['news', 'motd'] }] });

describe('global placeholder editor data', () => {
    it('reads a typed value and the shared list', () => {
        const form = parseGlobalPlaceholder([0, 0, 0], `$(greeting)\tHello\t${SHARED}`);

        expect(form.mode).toBe(GLOBAL_PLACEHOLDER_FROM_VALUE);
        expect(form.name).toBe('greeting');
        expect(form.value).toBe('Hello');
        expect(form.rooms).toEqual([{ roomId: 12, roomName: 'Lobby', placeholders: ['news', 'motd'] }]);
    });

    it('keeps a linked source that is no longer shared selectable', () => {
        const form = parseGlobalPlaceholder([1, 0, 44], 'motd\told\t{"rooms":[]}');

        expect(form.mode).toBe(GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM);
        expect(form.roomId).toBe(44);
        expect(form.placeholderName).toBe('old');
        expect(form.rooms).toEqual([{ roomId: 44, roomName: '#44', placeholders: ['old'] }]);
    });

    it('survives a missing or broken shared list', () => {
        expect(parseGlobalPlaceholder([], null).rooms).toEqual([]);
        expect(parseGlobalPlaceholder([0], 'a\tb\tnot json').rooms).toEqual([]);
        expect(parseGlobalPlaceholder([0], 'a\tb\t{"rooms":[{"roomName":"x"}]}').rooms).toEqual([]);
    });

    it('saves in the upstream int and string contract', () => {
        const typed = parseGlobalPlaceholder([0], `x\t${'v'.repeat(150)}\t${SHARED}`);

        expect(serializeGlobalPlaceholder(typed)).toEqual({ intParams: [0, 0, 0], stringParam: `x\t${'v'.repeat(100)}` });

        const linked = { ...typed, mode: GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM, roomId: 12, placeholderName: 'news' };

        expect(serializeGlobalPlaceholder(linked)).toEqual({ intParams: [1, 0, 12], stringParam: 'x\tnews' });
    });

    it('names itself after the picked source until renamed', () => {
        const empty = parseGlobalPlaceholder([1, 0, 12], `\t\t${SHARED}`);
        const first = selectGlobalPlaceholderSource({ ...empty, placeholderName: '' }, 'news');

        expect(first.name).toBe('news');
        expect(selectGlobalPlaceholderSource(first, 'motd').name).toBe('motd');
        expect(selectGlobalPlaceholderSource({ ...first, name: 'mine' }, 'motd').name).toBe('mine');
    });

    it('needs a name for a value and a source for another room', () => {
        const typed = parseGlobalPlaceholder([0], 'x\tv');

        expect(isGlobalPlaceholderValid(typed)).toBe(true);
        expect(isGlobalPlaceholderValid({ ...typed, name: '' })).toBe(false);
        expect(isGlobalPlaceholderValid({ ...typed, mode: GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM, roomId: 12, placeholderName: '' })).toBe(false);
        expect(isGlobalPlaceholderValid({ ...typed, mode: GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM, roomId: 12, placeholderName: 'news' })).toBe(true);
    });
});

describe('daily task name', () => {
    it('keeps the task name of an upstream name and task pair, capped', () => {
        expect(normalizeDailyTaskName('laps\tRun five laps')).toBe('Run five laps');
        expect(normalizeDailyTaskName('a\r\nb')).toBe('ab');
        expect(normalizeDailyTaskName('x'.repeat(120))).toHaveLength(100);
        expect(normalizeDailyTaskName(null)).toBe('');
    });
});
