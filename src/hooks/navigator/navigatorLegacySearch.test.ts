import { describe, expect, it } from 'vitest';
import { getSearchCodeByLegacySearchType, resolveNavigatorSearchLink, resolveNavigatorTabCode } from './navigatorLegacySearch';

describe('navigatorLegacySearch', () => {
    it('maps the legacy integer search types like FakeMainViewCtrl', () => {
        expect(getSearchCodeByLegacySearchType(1)).toBe('popular');
        expect(getSearchCodeByLegacySearchType(6)).toBe('favorites');
        expect(getSearchCodeByLegacySearchType(9)).toBe('query');
        expect(getSearchCodeByLegacySearchType(23)).toBe('history_freq');
        expect(getSearchCodeByLegacySearchType(99)).toBe('query');
    });

    it('resolves legacy integer links to the emulator codes', () => {
        expect(resolveNavigatorSearchLink(['navigator', 'search', '6'])).toEqual({ code: 'favorites', filter: '' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', '9', 'tag:party'])).toEqual({ code: 'hotel_view', filter: 'tag:party' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', '7'])).toEqual({ code: 'history_freq', filter: '' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', '11'])).toEqual({ code: 'official_view', filter: '' });
    });

    it('keeps top-level and emulator category codes with their filter', () => {
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'hotel_view', 'owner:Bob'])).toEqual({ code: 'hotel_view', filter: 'owner:Bob' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'myworld_view'])).toEqual({ code: 'myworld_view', filter: '' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'popular'])).toEqual({ code: 'popular', filter: '' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'eventcategory__1'], ['eventcategory__1'])).toEqual({ code: 'eventcategory__1', filter: '' });
    });

    it('bridges the legacy named codes the emulator does not answer', () => {
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'groups'])).toEqual({ code: 'hotel_view', filter: 'group:' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'groups', 'Cats'])).toEqual({ code: 'hotel_view', filter: 'group:Cats' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'friends_rooms'])).toEqual({ code: 'with_friends', filter: '' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'new_ads'])).toEqual({ code: 'roomads_view', filter: '' });
    });

    it('treats anything else as free text searched in hotel_view', () => {
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'cats'])).toEqual({ code: 'hotel_view', filter: 'cats' });
        expect(resolveNavigatorSearchLink(['navigator', 'search', 'a', 'b'])).toEqual({ code: 'hotel_view', filter: 'a/b' });
        expect(resolveNavigatorSearchLink(['navigator', 'search'])).toBeNull();
        expect(resolveNavigatorSearchLink(['navigator', 'search', ''])).toBeNull();
    });

    it('maps the "me" tab link to myworld_view', () => {
        expect(resolveNavigatorTabCode('me')).toBe('myworld_view');
        expect(resolveNavigatorTabCode('hotel_view')).toBe('hotel_view');
    });
});
