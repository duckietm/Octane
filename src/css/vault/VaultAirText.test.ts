import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/vault/VaultView.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/vault/VaultView.tsx'), 'utf8');

describe('earnings window text (vault_view)', () => {
    it('is regular Ubuntu with u_bold 12 labels and 14 px amounts', () => {
        expect(css).toMatch(/\.octane-vault \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.octane-vault__label \{[^}]*font-size: 12px;[^}]*font-weight: 700;/);
        expect(css).toMatch(/\.octane-vault__value \{[^}]*font-size: 14px;/);
    });

    it('uses the grey AIR buttons instead of green', () => {
        expect(css).toMatch(/\.octane-vault__claim \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*font-weight: 400;/);
        expect(css).toMatch(/\.octane-vault__claim-all \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\);[^}]*font-weight: 700;/);
        expect(view).not.toMatch(/#72b03a|text-white/);
    });
});
