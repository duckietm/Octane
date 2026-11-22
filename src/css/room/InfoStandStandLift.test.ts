import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('avatar on a profile stand', () => {
    const css = read('src/css/backgrounds/BackgroundsView.css');

    // Rows of the platform centre in each 135 px stand picture, measured against the avatar's feet (row 116).
    it('lands the feet on the platform of every stand', () => {
        for (let id = 1; id <= 21; id++) expect(css).toMatch(new RegExp(`\\.profile-stand\\.stand-${id} ~ \\* \\{ --stand-feet: \\d+; \\}`));
        expect(css).toMatch(/\.profile-stand ~ \.avatar-image,\s*\.profile-stand ~ \.profile-overlay:is\(\.overlay-5, \.overlay-6, \.overlay-7, \.overlay-8\) \{\s*transform: translateY\(calc\(\(var\(--stand-feet, 116\) - 116\) \* 1px\)\);/);
    });

    it('has no fixed lift left in the infostand or the picker', () => {
        expect(read('src/css/room/InfoStand.css')).not.toMatch(/translateY\(-8px\)/);
        expect(css).not.toMatch(/~ \.avatar-image \{\s*transform: translateY\(-8px\)/);
    });
});
