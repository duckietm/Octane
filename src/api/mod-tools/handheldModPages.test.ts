import { describe, expect, it } from 'vitest';
import { activeModPage, backModPage, focusModPage, MOD_START_PAGE, modPageId, openedModPages } from './handheldModPages';

const win = (type: string, key: string, revision = 0, hidden = false) => ({ type, key, revision, hidden });

describe('handheld mod tool pages', () => {
    it('names a page by its window type and key', () => {
        expect(modPageId('userInfo', '7')).toBe('userInfo:7');
    });

    it('sees pages that were opened or shown again', () => {
        const before = [win('userInfo', '7'), win('issueBrowser', 'main', 0, true), win('roomTool', '3')];
        const after = [win('userInfo', '7'), win('issueBrowser', 'main'), win('roomTool', '3', 1), win('userChatlog', '7')];

        expect(openedModPages(before, after)).toEqual(['issueBrowser:main', 'roomTool:3', 'userChatlog:7']);
        expect(openedModPages(after, after)).toEqual([]);
        expect(openedModPages(after, [win('userInfo', '7', 0, true)])).toEqual([]);
    });

    it('puts the last page gone to in front and falls back past closed ones', () => {
        const windows = [win('userInfo', '7'), win('roomTool', '3')];
        let focus = focusModPage([], 'userInfo:7');

        focus = focusModPage(focus, 'roomTool:3');
        expect(activeModPage(focus, windows)).toBe('roomTool:3');

        focus = focusModPage(focus, 'userInfo:7');
        expect(focus).toEqual(['roomTool:3', 'userInfo:7']);
        expect(activeModPage(focus, windows)).toBe('userInfo:7');

        // the user page is closed: the room tool comes back
        expect(activeModPage(focus, [win('roomTool', '3')])).toBe('roomTool:3');
        // nothing open: the start page
        expect(activeModPage(focus, [])).toBe(MOD_START_PAGE);
        // a hidden window is not a page
        expect(activeModPage(['issueBrowser:main'], [win('issueBrowser', 'main', 0, true)])).toBe(MOD_START_PAGE);
    });

    it('goes back to the page before, keeping the page that stepped aside open', () => {
        const windows = [win('userInfo', '7'), win('roomTool', '3')];
        const back = backModPage(['userInfo:7', MOD_START_PAGE, 'roomTool:3'], windows);

        expect(back).toEqual(['userInfo:7', MOD_START_PAGE]);
        expect(activeModPage(back, windows)).toBe(MOD_START_PAGE);
        expect(activeModPage(backModPage(back, windows), windows)).toBe('userInfo:7');
        expect(activeModPage(backModPage(['userInfo:7'], windows), windows)).toBe(MOD_START_PAGE);
    });
});
