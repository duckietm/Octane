import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const view = readFileSync(join(process.cwd(), 'src/components/navigator/NavigatorView.tsx'), 'utf8');

describe('navigator shell', () => {
    it('exposes a collapsible quick-links navigation beside the browsing workspace', () => {
        expect(view).toContain('octane-navigator-air__skin');
        expect(view).toContain('octane-navigator-air__quick-links');
        expect(view).toContain('aria-label={quickLinksLabel}');
        expect(view).toContain('aria-expanded={isOpenSavesSearches}');
        expect(view).toContain('aria-label={navigatorLabel}');
        expect(view).toContain('octane-navigator-air__quick-toggle');
    });

    it('reads the home room through a navigator data that may not be loaded yet', () => {
        expect(view).toContain('const homeRoomId = navigatorData?.homeRoomId ?? 0;');
        expect(view).not.toContain('navigatorData.homeRoomId');
    });

    it('removes the open-room callback it registers when the view unmounts', () => {
        expect(view).toContain('LegacyExternalInterface.addCallback(HabboWebTools.OPENROOM');
        expect(view).toContain('LegacyExternalInterface.removeCallback(HabboWebTools.OPENROOM);');
    });
});
