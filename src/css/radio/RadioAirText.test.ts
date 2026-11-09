import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/radio/RadioView.css');

describe('radio text (AIR conventions)', () => {
    it('is regular Ubuntu with an 11 px floor and 12 px station names', () => {
        expect(css).toMatch(/\.radio-widget \{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif/);
        expect(css).toMatch(/\.radio-widget :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu[^}]*!important/);
        expect(css).toMatch(/\.radio-widget :where\(\.text-\\\[9px\\\], \.text-\\\[10px\\\]\):not\(svg, svg \*\) \{[^}]*font-size: 11px !important/);
        expect(css).toMatch(/\.radio-widget :where\(\.text-sm\):not\(svg, svg \*\) \{[^}]*font-size: 12px !important/);
    });
});
