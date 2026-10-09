import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/common/layout/LayoutAvatarImageView.tsx'), 'utf8');

describe('LayoutAvatarImageView compact heads', () => {
    it('rasterizes and caches compact heads at the requested final size', () => {
        expect(source).toMatch(/compactHeadSize\?:\s*number/);
        expect(source).toMatch(/compactHeadPadding\?:\s*number/);
        expect(source).toMatch(/cropTransparentImageUrl\(imageUrl,\s*compactHeadSize,\s*compactHeadPadding\)/);
        expect(source).toMatch(
            /figureKey\s*=\s*\[figure, gender, direction, headOnly, compactHead, compactHeadSize, compactHeadPadding, fit, small, airMeMenu, nativeCroppedHead\]/
        );
    });

    it('paints the me-menu face as a 50px image instead of the 90x130 background box', () => {
        expect(source).toContain("newClassNames = ['tb-memenu-face pointer-events-none']");
        expect(source).toContain('tb-memenu-face-img');
        expect(source).not.toContain("headOnly || airMeMenu");
    });
});
