import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/WiredView.css'), 'utf8');

describe('wired box text (wired_style_illumina / wired_style_volter)', () => {
    it('sets Illumina to regular Ubuntu 11 px with 10 px buttons and Volter to 9 px, over the layered rules', () => {
        const base = css.slice(css.indexOf('@layer base {\n    .octane-wired.octane-wired--style-illumina'));

        expect(base).toMatch(/--style-illumina \.octane-wired__body :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu[^}]*font-size: 11px !important/);
        expect(base).toMatch(/--style-illumina \.octane-wired__body button\.font-bold[^{]*\{[^}]*font-size: 10px !important/);
        expect(base).toMatch(/--volter \.octane-wired__body :where\(\*\):not\(svg, svg \*\) \{[^}]*Volter[^}]*font-size: 9px !important/);
    });

    it('draws the shared black text white in the dark Volter style', () => {
        expect(css).toContain('.text-\\[\\#000000\\] {\n        color: #fff !important;');
    });

    it('sets the wired menu windows in regular Ubuntu', () => {
        expect(css).toMatch(/\.octane-wired-menu :where\(\*\):not\(svg, svg \*, \.font-mono\) \{[^}]*HabboAirUbuntu/);
    });

    it('tints the wired menu clear_log_btn and roll_back_btn 0xe33934 as AIR, white 12 px regular', () => {
        const monitor = readFileSync(join(process.cwd(), 'src/components/wired-tools/WiredMonitorTabView.tsx'), 'utf8');
        const settings = readFileSync(join(process.cwd(), 'src/components/wired-tools/WiredToolsSettingsTabView.tsx'), 'utf8');
        const buttons = '.octane-wired-menu :is(.octane-wired-menu__clear-log, .octane-wired-menu__roll-back).habbo-btn-danger';

        expect(monitor).toContain('octane-wired-menu__clear-log');
        expect(settings).toContain('octane-wired-menu__roll-back');
        expect(css).toContain(`${buttons} {\n        border-image-source: var(--habbo-skin-shiny-tint-e33934) !important;\n        color: #ffffff !important;`);
        expect(css).toContain(`${buttons}:hover {\n        border-image-source: var(--habbo-skin-shiny-tint-e33934-hover) !important;`);
    });
});
