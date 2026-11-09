import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/user-profile/UserProfileView.css'), 'utf8');

describe('user profile text (new_extended_profile)', () => {
    it('is regular Ubuntu with a 12 px bold friend status and a bold hidden-profile notice', () => {
        expect(css).toMatch(/\.octane-extended-profile-window :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.octane-extended-profile__status-text \{[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-extended-profile__hidden-notice \{[^}]*font-weight: 700/);
    });

    it('scrolls a long group list inside the panel', () => {
        expect(css).toMatch(/\.octane-extended-profile-groups \{[^}]*grid-template-rows: minmax\(0, 1fr\)/);
        expect(css).toMatch(/\.octane-extended-profile-groups__sidebar \{[^}]*min-height: 0/);
        expect(css).toMatch(/\.octane-extended-profile-groups__list \{[^}]*min-height: 0;[^}]*overflow-y: auto/);
    });

    it('draws addasfriend_button as the grey shiny button with 12 px regular black text', () => {
        expect(css).toMatch(/\*\/\s*\.octane-extended-profile__friend-button \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*border-radius: 0;[^}]*color: #000000;[^}]*font-size: 12px;[^}]*font-weight: 400;/);
    });

    it('draws the body texts pure black like the layout (status, motto, relationships, rooms, groups)', () => {
        for (const sel of ['__motto', '__meta', '__status-text', '__relationships-label', '__relationship-name', '__summary-button']) {
            expect(css).toMatch(new RegExp(`\\.octane-extended-profile${sel} \\{[^}]*color: #000000;`));
        }
        expect(css).toMatch(/\.octane-extended-profile-group-info__description \{[^}]*color: #000000;/);
        expect(css).toMatch(/\.octane-extended-profile__hidden-notice \{[^}]*color: #555/);
    });
});

