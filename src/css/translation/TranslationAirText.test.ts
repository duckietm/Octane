import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/translation/TranslationSettings.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/translation/TranslationSettingsView.tsx'), 'utf8');

describe('translation settings text (AIR conventions)', () => {
    it('is regular Ubuntu 12 px black with a grey 12 px button', () => {
        expect(view).toContain("import '../../css/translation/TranslationSettings.css';");
        expect(css).toMatch(/\.translation-settings-window \.octane-card-content-shell \{[^}]*color: #000;[^}]*font-size: 12px;/);
        expect(css).toMatch(/\.translation-settings-window \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.translation-settings-window__refresh \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*font-size: 12px;/);
    });
});
