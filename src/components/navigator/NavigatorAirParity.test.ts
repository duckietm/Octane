import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

describe('AIR navigator visual contract', () => {
    it('opts the shell into Ubuntu frame style 3 with 425/578 widths and native action bitmaps', () => {
        const view = read('src/components/navigator/NavigatorView.tsx');
        const css = read('src/css/navigator/NavigatorView.css');

        expect(view).toContain('octane-navigator-air__skin');
        expect(view).toContain('octane-navigator-air__close');
        expect(view).toContain('octane-navigator-air__quick-toggle');
        expect(css).toContain('frame-ubuntu-3.png');
        expect(css).toContain('close-3-hover.png');
        expect(css).toContain('tab-3-default-left.png');
        expect(css).toContain('tab-3-selected-mid.png');
        expect(view).toContain('ForwardToSomeRoomMessageComposer');
        expect(view).toContain('create-room.png');
        expect(view).toContain('promote-room.png');
        expect(view).toContain('octane-navigator-air__action-border');
        expect(css).toContain('border-4.png');
        expect(css).toContain('border-5.png');
        expect(css).toContain('color: #ffffff !important');
        expect(view).not.toContain('FindNewFriendsMessageComposer');
        expect(css).toContain('width: 425px');
        expect(css).toContain('width: 578px');
        expect(css).toContain('width: 88px');
        expect(css).toContain('width: 383px');
        expect(css).toContain('height: 20px');
        expect(css).toContain('width: 122px');
        expect(css).toContain('height: 146px');
        expect(css).toContain('width: 189px');
        expect(css).toContain('height: 60px');
        expect(css).toContain('left: 205px');
        expect(css).toContain('width: 187px');
        expect(css).not.toContain('object-fit: fill');
        expect(css).toContain('width: 374px');
        expect(css).toContain('bubble-7.png');
        expect(css).toContain('bubble-pointer-left.png');
    });

    it('searches only on explicit submit rather than a live debounce', () => {
        const search = read('src/components/navigator/views/search/NavigatorSearchView.tsx');

        expect(search).toContain('onSubmit');
        expect(search).not.toContain('300');
        expect(search).not.toContain('setTimeout');
    });

    it('uses an AIR dropmenu instead of a native select for search filters', () => {
        const filter = read('src/components/navigator/views/search/NavigatorFilterChipsView.tsx');
        const css = read('src/css/navigator/NavigatorView.css');

        expect(filter).not.toContain('<select');
        expect(filter).toContain('octane-navigator-air__filter-list');
        expect(css).toContain('dropmenu-3.png');
        expect(css).toContain('octane-navigator-air__tab-shelf');
        expect(css).toContain('close-3-default.png');
    });

    it('centres the room info bubble on its real height like RoomInfoPopup.showAt', () => {
        const store = read('src/hooks/navigator/navigatorRoomInfoPopupStore.ts');
        const popup = read('src/components/navigator/views/search/NavigatorRoomInfoPopupView.tsx');

        // AIR does `new Point(x, y - _window.height / 2)` after populate() sized the window, so the
        // store may only keep the raw anchor and the view divides the measured height.
        expect(store).not.toContain('POPUP_HEIGHT');
        expect(store).toContain('y: point.y\n');
        expect(store).toContain('{ x: rect.right - 6, y: midY + 56 }');
        expect(store).toContain('{ x: rect.right + 20, y: midY }');
        expect(popup).toContain("transform: 'translateY(-50%)'");
    });

    it('lays the saved-searches pane out on AIR left_pane window coordinates', () => {
        const view = read('src/components/navigator/views/search/NavigatorSearchSavesResultView.tsx');
        const css = read('src/css/navigator/NavigatorView.css');
        const rule = (selector: string) => {
            const at = css.indexOf(selector + ' {');
            return css.slice(at, css.indexOf('}', at));
        };

        // left_hide_container: bitmap (3,3) 18x18, caption (20,2) h17 in id_heading_2.
        expect(view).not.toContain('gap={1}');
        expect(rule('.octane-navigator-search-saves-result__header-icon')).toContain('left: 3px');
        expect(rule('.octane-navigator-search-saves-result__header-icon')).toContain('top: 3px');
        expect(rule('.octane-navigator-search-saves-result__header-label')).toContain('left: 20px');
        expect(rule('.octane-navigator-search-saves-result__header-label')).toContain('top: 2px');

        // quick_link_text inherits the Ubuntu theme default u_regular: 12px, black.
        expect(rule('.saved-search-row__label')).toContain('font-size: 12px');
        expect(rule('.saved-search-row__label')).toContain('line-height: 17px');

        // remove_quick_link sits at x=115 and its bitmap is a native 10x10.
        expect(rule('.saved-search-row__delete')).toContain('left: 115px');
        expect(rule('.saved-search-row__delete')).toContain('10px 10px');
        expect(rule('.saved-search-row__delete')).not.toContain('16px 16px no-repeat');
    });
});
