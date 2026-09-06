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
});
