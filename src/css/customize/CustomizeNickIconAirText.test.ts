import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/customize/CustomizeNickIconAirText.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/customize/CustomizeNickIconView.tsx'), 'utf8');

describe('customize bubble identity text (AIR conventions, no AIR layout)', () => {
    it('is regular Ubuntu at 12 px but keeps the chosen prefix fonts', () => {
        expect(view).toContain("import '../../css/customize/CustomizeNickIconAirText.css'");
        expect(css).toMatch(/\.customize-nick-icon-window \{[^}]*HabboAirUbuntu[^}]*font-size: 12px/);
        expect(css).toMatch(
            /\.customize-nick-icon-window :where\(\*\):not\(svg, svg \*, \.prefix, \.prefix \*, \.customize-nick-icon-window__font-sample\) \{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/
        );
        expect(view).toContain('className="customize-nick-icon-window__font-sample" style={customPrefixFontStyle}');
    });

    it('uses 12 px buttons, tabs and fields, and 10 px badges', () => {
        expect(css).toMatch(/@layer base \{[\s\S]*:is\(\.habbo-btn-primary, \.habbo-btn-secondary, \.habbo-btn-danger\) \{[^}]*font-size: 12px !important/);
        expect(css).toMatch(/\.customize-nick-icon-window \.octane-card-tab-item \{[^}]*font-size: 12px/);
        expect(view).not.toContain('text-[9px]');
        expect(view).not.toMatch(/\btext-sm\b/);
        expect(view).not.toContain('py-1.5 text-[11px] font-bold');
    });

    it('keeps green only on the Buy buttons and draws the rest on the grey shiny skin', () => {
        expect(css).toMatch(/\.customize-nick-icon-window \.habbo-btn-secondary \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important;/);
        expect(view).toContain("variant={item.owned ? 'secondary' : 'success'}");
        expect(view).toMatch(/variant="success" disabled=\{!customPrefixIsValid \|\| isLoading\} onClick=\{handleCustomPrefixPurchase\}/);
        expect(view).not.toMatch(/<Button (?![^>]*variant=)/);
    });
});

