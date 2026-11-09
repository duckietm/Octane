import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/rare-values/RareValuesAirText.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/rare-values/RareValuesView.tsx'), 'utf8');

describe('rare values text (AIR conventions, no AIR layout)', () => {
    it('is regular Ubuntu at 12 px', () => {
        expect(css).toMatch(/\.octane-rare-values-window \{[^}]*HabboAirUbuntu[^}]*font-size: 12px/);
        expect(css).toMatch(/@layer base \{\s*\.octane-rare-values-window :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(view).toContain("import '../../css/rare-values/RareValuesAirText.css'");
        expect(view).toContain('octane-rare-values-window');
    });

    it('draws names u_regular 12, values u_bold 12 and the meta lines il_regular 11', () => {
        expect(view).not.toContain('text-[13px]');
        // u_regular body text is pure black (#000), not the earlier #1f2d34.
        expect(view).toContain('className="grow text-[12px] text-black"');
        expect(view).not.toContain('text-[#1f2d34]');
        expect(view).toMatch(/<Text bold textEnd className="text-\[12px\]/);
        expect(view).toContain('<Text className="text-[11px] text-black/45">');
    });
});
