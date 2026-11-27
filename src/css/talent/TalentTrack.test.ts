import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/talent/TalentTrack.css'), 'utf8');

describe('talent track progress needle', () => {
    it('sizes the head image to the 33 x 34 needle instead of the shared 90 x 130 avatar box', () => {
        const rule = css.match(/\.octane-talent-progress__head \.avatar-image\s*\{([^}]+)\}/)?.[1] ?? '';

        expect(rule).toContain('width: 100%');
        expect(rule).toContain('height: 100%');
    });
});
