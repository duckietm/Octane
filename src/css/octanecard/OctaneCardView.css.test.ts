import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const cssPath = join(process.cwd(), 'src/css/octanecard/OctaneCardView.css');
const indexCssPath = join(process.cwd(), 'src/css/index.css');
const catalogViewPath = join(process.cwd(), 'src/components/catalog/CatalogView.tsx');
const catalogCssPath = join(process.cwd(), 'src/css/catalog/CatalogView.css');
const userProfileCssPath = join(process.cwd(), 'src/css/user-profile/UserProfileView.css');
const helpCssPath = join(process.cwd(), 'src/css/help/HelpView.css');
const indexTsxPath = join(process.cwd(), 'src/index.tsx');
const vaultViewPath = join(process.cwd(), 'src/components/vault/VaultView.tsx');
const legacyHabboSwfSkinPath = join(process.cwd(), 'src/css/habbo/HabboSwfSkin.css');

describe('OctaneCardView.css', () => {
    it('targets the card classes rendered by shared card components', () => {
        const css = readFileSync(cssPath, 'utf8');

        expect(css).toContain('.octane-card-shell');
        expect(css).toContain('.octane-card-shell:not(.octane-wired)');
        expect(css).toContain('.octane-card-header-shell');
        expect(css).toContain('.octane-card-content-shell');
        expect(css).toContain('.octane-card-tabs-shell');
        expect(css).toContain('.octane-card-tab-item');
    });

    it('keeps generic card shell ownership out of global index css', () => {
        const css = readFileSync(indexCssPath, 'utf8');

        expect(css).not.toContain('.octane-card-shell:not(.octane-wired)');
        expect(css).not.toContain('.octane-card-tabs-shell');
        expect(css).not.toContain('.octane-card-tab-item');
    });

    it('keeps standard card chrome out of feature-level window skins', () => {
        const catalogView = readFileSync(catalogViewPath, 'utf8');
        const catalogCss = readFileSync(catalogCssPath, 'utf8');
        const userProfileCss = readFileSync(userProfileCssPath, 'utf8');
        const helpCss = readFileSync(helpCssPath, 'utf8');
        const indexTsx = readFileSync(indexTsxPath, 'utf8');
        const vaultView = readFileSync(vaultViewPath, 'utf8');
        const legacySwfWindowClass = ['habbo', 'swf', 'window'].join('-');

        expect(catalogView).not.toContain(legacySwfWindowClass);
        expect(catalogView).not.toContain('buildersClubHeaderStyle');
        expect(indexTsx).not.toContain(['Habbo', 'Swf', 'Skin', 'css'].join('.'));
        expect(existsSync(legacyHabboSwfSkinPath)).toBe(false);
        expect(catalogCss).not.toMatch(/\.octane-catalog-window\s+\.octane-card-(?:header|header-shell|title|close-button)/);
        expect(catalogCss).not.toMatch(/\.octane-catalog-tabs-shell\s+\.octane-card-tab-item:hover/);
        expect(catalogCss).not.toMatch(/\.octane-catalog-tabs-shell\s+\.octane-card-tab-item-active/);
        expect(catalogCss).not.toMatch(/\.octane-catalog-tabs-shell\s+\.octane-card-tab-item\s*\{[^}]*\b(?:background|border|box-shadow|color|text-shadow)\s*:/s);
        expect(userProfileCss).not.toMatch(/\.octane-extended-profile-window\s+\.octane-card-(?:header-shell|title|close-button)/);
        expect(helpCss).not.toContain('.octane-card.octane-help');
        expect(vaultView).not.toContain('.octane-card.octane-vault');
    });
});
