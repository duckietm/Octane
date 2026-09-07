import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8').split('\r\n').join('\n');

describe('Toolbar navigator hover menu', () => {
    const toolbar = read('src/components/toolbar/ToolbarView.tsx');
    const navigator = read('src/components/navigator/NavigatorView.tsx');

    it('opens the navigator from every row through the shared link map', () => {
        expect(toolbar).toContain('CreateLinkEvent(NAVIGATOR_HOVER_LINKS[id]);');
        // The home row stays inert without a home room, as onHomeClick does.
        expect(toolbar).toContain("if((id === 'home') && (homeRoomId <= 0)) return;");
    });

    it('splits the history rows: the label opens the navigator, the chevron unfolds the inline list', () => {
        const label = toolbar.match(/className="tb-navigator-hover-row-label[^"]*"\s*onClick=\{ \(\) => activate\(item\.id\) \}/);
        const toggle = toolbar.match(/className="tb-navigator-hover-row-toggle"[\s\S]*?onClick=\{ \(\) => toggleList\(item\.id\) \}/);

        expect(label).not.toBeNull();
        expect(toggle).not.toBeNull();
        expect(toolbar).toContain('aria-expanded={ expandedList === item.id }');
        expect(toolbar).not.toContain("case 'history':\n            case 'frequent':\n                setExpandedList");
    });

    it('lets navigator/me/<code> unfold and scroll to that block of the me tab', () => {
        expect(navigator).toContain('setFocusResultCode(parts[2] || null);');
        expect(navigator).toContain('querySelector<HTMLElement>(`[data-result-code="${focusResultCode}"]`)');
        expect(navigator).toContain('store.setResultCollapsed(focusResultCode, false);');
        expect(read('src/components/navigator/views/search/NavigatorSearchResultView.tsx')).toContain('data-result-code={searchResult.code}');
    });
});
