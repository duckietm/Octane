import { describe, expect, it } from 'vitest';
import { parseHousekeepingSearch } from './HousekeepingSearch';

describe('parseHousekeepingSearch', () => {
    it('reads #id as a user id', () => {
        expect(parseHousekeepingSearch('#12')).toEqual({ kind: 'user-id', id: 12 });
        expect(parseHousekeepingSearch(' #12 ')).toEqual({ kind: 'user-id', id: 12 });
    });

    it('reads the room prefixes as a room id', () => {
        expect(parseHousekeepingSearch('s:411')).toEqual({ kind: 'room-id', id: 411 });
        expect(parseHousekeepingSearch('stanza: 411')).toEqual({ kind: 'room-id', id: 411 });
        expect(parseHousekeepingSearch('ROOM:#7')).toEqual({ kind: 'room-id', id: 7 });
    });

    it('treats other input as a name search once it has two characters', () => {
        expect(parseHousekeepingSearch('al')).toEqual({ kind: 'text', text: 'al' });
        expect(parseHousekeepingSearch('a')).toEqual({ kind: 'too-short' });
        expect(parseHousekeepingSearch('')).toEqual({ kind: 'empty' });
        expect(parseHousekeepingSearch('#0')).toEqual({ kind: 'too-short' });
    });
});
