import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/chat/ChatInputHabbiconSelectorView.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('habbicon hub buttons (habbicon_view)', () => {
    it('tints the reward / buy / claim buttons 0x01a101 on the shiny skin with white 12 px captions, as AIR', () => {
        const action = rule('.habbicon-action');

        expect(action).toContain('border-image-source: var(--habbo-skin-shiny-tint-01a101);');
        expect(action).toContain('border-image-slice: 5 fill;');
        expect(action).toContain('color: #ffffff;');
        expect(action).toMatch(/font:\s*12px HabboAirUbuntu/);
        expect(rule('.habbicon-action:hover')).toContain('var(--habbo-skin-shiny-tint-01a101-hover)');
        expect(rule('.habbicon-action:active')).toContain('var(--habbo-skin-shiny-tint-01a101-pressed)');
        expect(rule('.habbicon-action:disabled')).toContain('var(--habbo-skin-shiny-tint-01a101-disabled)');
        expect(css).not.toMatch(/\.habbicon-action \{[^}]*border-image:/);
    });

    it('keeps the purchase confirmation confirm_button on the thick 0x00aa00 skin', () => {
        expect(rule('.habbicon-purchase-body .habbicon-action')).toContain('border-image-source: var(--habbo-skin-shiny-thick-green);');
    });
});
