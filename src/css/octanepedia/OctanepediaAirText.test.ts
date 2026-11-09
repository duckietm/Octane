import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/octanepedia/OctanepediaAirText.css');
const view = read('src/components/octanepedia/OctanepediaView.tsx');

describe('octanepedia text (AIR conventions)', () => {
    it('sets the page in regular Ubuntu, 12 px pure black', () => {
        expect(view).toContain("import '../../css/octanepedia/OctanepediaAirText.css';");
        expect(view).toContain('octanepedia__page');
        expect(css).toMatch(/\.octanepedia \.octanepedia__page :where\(\*\):not\(svg, svg \*, code, pre, kbd\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.octanepedia \.octanepedia__page \{[^}]*color: #000000;[^}]*font-size: 12px/);
    });

    it('draws headings 16 / 14 px bold', () => {
        expect(css).toMatch(/:where\(h1, h2\) \{[^}]*font-size: 16px;[^}]*font-weight: 700/);
        expect(css).toMatch(/:where\(h3, h4, h5, h6\) \{[^}]*font-size: 14px;[^}]*font-weight: 700/);
    });
});
