import { describe, expect, it } from 'vitest';
import { getActiveTextLocale, habboPageCandidates, normalizeHabboPagePath, setActiveTextLocale } from './habboPages';

describe('normalizeHabboPagePath', () => {
    it.each([
        ['chat/commands', 'chat/commands'],
        ['/chat/commands/', 'chat/commands'],
        ['wired_actie.html', 'wired_triggers'],
        ['wired_reactie.html', 'wired_effects'],
        ['Wired_Scorebord', 'wired_leaderboards'],
        ['navigator/index.html', 'navigator'],
        ['chat/chatting', 'chat/commands'],
        ['commands', 'chat/commands'],
        ['habboclub', 'habboclub'],
        ['', '']
    ])('%s -> %s', (path, page) => {
        expect(normalizeHabboPagePath(path)).toBe(page);
    });
});

describe('habboPageCandidates', () => {
    it('tries the player language, the hotel language, English, then the older places', () => {
        expect(habboPageCandidates('forums', 'de', 'nl')).toEqual(['de/forums.html', 'nl/forums.html', 'en/forums.html', 'forums.html', 'forums/index.html', 'forums']);
    });

    it('does not repeat a language', () => {
        expect(habboPageCandidates('forums', 'en', 'en')).toEqual(['en/forums.html', 'forums.html', 'forums/index.html', 'forums']);
        expect(habboPageCandidates('forums', '', 'nl')).toEqual(['nl/forums.html', 'en/forums.html', 'forums.html', 'forums/index.html', 'forums']);
    });

    it('ignores a locale that is not a language code, and answers nothing for no page', () => {
        expect(habboPageCandidates('forums', '../x', 'en')[0]).toBe('en/forums.html');
        expect(habboPageCandidates('', 'nl')).toEqual([]);
    });

    it('takes the language part of a regional code', () => {
        expect(habboPageCandidates('help', 'pt-BR', 'en')[0]).toBe('pt/help.html');
    });
});

describe('the active text locale', () => {
    it('is kept as a plain language code', () => {
        setActiveTextLocale('NL');
        expect(getActiveTextLocale()).toBe('nl');
        setActiveTextLocale(null);
        expect(getActiveTextLocale()).toBe('');
    });
});
