import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Texts from the external files and values from the server reach these views as HTML: each one goes through
// SanitizeHtml, as every other dangerouslySetInnerHTML in the client already does.
const SITES = [
    'components/hc-center/HcCenterView.tsx',
    'components/guide-tool/views/GuideToolMenuView.tsx',
    'components/quests/QuestEntryView.tsx',
    'components/wired/views/extras/WiredPlaceholderPreview.tsx'
];

describe('raw HTML sites', () => {
    it.each(SITES)('%s sanitizes every HTML it renders', (path) => {
        const source = readFileSync(join(__dirname, '../..', path), 'utf8');
        const sites = source.split('dangerouslySetInnerHTML').slice(1);

        expect(sites.length).toBeGreaterThan(0);
        for (const site of sites) expect(site.slice(0, 80)).toMatch(/__html:\s*SanitizeHtml\(/);
    });
});
