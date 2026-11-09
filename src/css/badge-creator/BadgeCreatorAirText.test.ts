import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/badge-creator/BadgeCreatorView.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/badge-creator/BadgeCreatorView.tsx'), 'utf8');

describe('badge creator text (Octane extra, AIR conventions)', () => {
    it('is regular Ubuntu, 12 px text and 12 px regular buttons', () => {
        expect(css).toMatch(/\.octane-badge-creator :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular/);
        expect(css).toMatch(/\.octane-badge-creator__content :where\(\*\):not\(svg, svg \*\) \{[^}]*font-size: 12px !important/);
        expect(css).toMatch(/\.octane-badge-creator__content button \{[^}]*font-weight: 400 !important/);
    });

    it('loads its sheet and marks the content area', () => {
        expect(view).toContain("import '../../css/badge-creator/BadgeCreatorView.css';");
        expect(view).toContain('octane-badge-creator__content');
    });

    it('draws the non-purchase buttons grey (AIR button style 3) and keeps the priced Create badge green', () => {
        expect(css).toMatch(/\.octane-badge-creator__content \.habbo-btn-secondary \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important;/);
        expect(css).toMatch(/\.octane-badge-creator__content \.habbo-btn-secondary:is\(:active, \.active\) \{[^}]*--habbo-skin-shiny-pressed/);
        expect(view).not.toContain('variant="primary"');
        expect(view).toContain("variant=\"secondary\" active={tool === 'paint'}");
        expect(view).toMatch(/onClick=\{handleSave\} disabled=\{submitting\} variant="success"/);
    });
});

