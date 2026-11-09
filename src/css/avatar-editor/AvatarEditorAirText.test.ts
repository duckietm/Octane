import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/avatar-editor/AvatarEditorView.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('avatar editor effects texts (avatarEditorContent)', () => {
    it('sets the effect name, time left and save hint in 12 px #666666', () => {
        expect(rule('.octane-avatar-editor-effects-params')).toContain('color: #666666');
        expect(rule('.octane-avatar-editor-effects-params')).toContain('font-size: 12px');
        expect(rule('.octane-avatar-editor-effect-time')).toContain('font-size: 12px');
    });

    it('draws get_more_button on the green shiny thick skin (button_thick tinted 0x00aa00), 12 px bold white', () => {
        const shop = rule('.octane-avatar-editor-effects-shop');
        expect(shop).toContain('border-image-source: var(--habbo-skin-shiny-thick-green)');
        expect(shop).toContain('border-radius: 0');
        expect(shop).toContain('font-size: 12px');
        expect(shop).not.toContain('background: #00aa00');
    });

    it('keeps the save button on the grey button_thick skin', () => {
        expect(css).toMatch(/\.octane-avatar-editor \.octane-avatar-editor-save \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\) !important;/);
    });

    it('draws the boy / girl tab titles u_bold black', () => {
        expect(rule('.octane-avatar-editor .category-item.gender-category-item')).toContain('color: #000000');
        expect(rule('.octane-avatar-editor .gender-category-item > span')).toContain('color: #000000 !important');
    });
});

