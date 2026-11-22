import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('avatar on a profile stand', () => {
    const css = read('src/css/backgrounds/BackgroundsView.css');
    const infostand = read('src/css/room/InfoStand.css');

    // Rows of the platform centre in each 135 px stand picture, measured against the avatar's feet (row 116).
    it('lands the feet on the platform of every stand, or else on the pedestal of the background', () => {
        for (let id = 1; id <= 21; id++) expect(css).toMatch(new RegExp(`\\.profile-stand\\.stand-${id} ~ \\* \\{ --stand-feet: \\d+; \\}`));
        expect(css).toMatch(
            /\.profile-stand ~ \.avatar-image,\s*\.profile-stand ~ \.profile-overlay:is\(\.overlay-5, \.overlay-6, \.overlay-7, \.overlay-8\) \{\s*transform: translateY\(calc\(\(var\(--stand-feet, var\(--bg-feet, 116\)\) - 116\) \* 1px\)\);/
        );
        // A white marble plate (measured at row 112) and a dark wooden one (row 110).
        expect(css).toMatch(/\.profile-background\.background-153 \{[^}]*--bg-feet: 112;/);
        expect(css).toMatch(/\.profile-background\.background-157 \{[^}]*--bg-feet: 110;/);
    });

    it('places every background on whole pixels, a 67 px one filling the last column', () => {
        expect(css).toMatch(/\.profile-background\.background-81 \{ background-position: 0 -23px;/);
        expect(css).toMatch(/\.profile-background\.background-70 \{ background-image: url\([^)]*\), url\([^)]*\); background-position: 0 -18px, 1px -18px;/);
    });

    it('draws the infostand well and the picker at the size of the profile picture', () => {
        expect(infostand).toMatch(/\.octane-infostand__avatar-well \{[^}]*width: 68px;\s*height: 135px;/);
        expect(css).toMatch(/\.profile-preview \{[^}]*width: 68px;\s*height: 135px;/);
        expect(infostand).not.toMatch(/translateY\(-8px\)/);
    });
});
