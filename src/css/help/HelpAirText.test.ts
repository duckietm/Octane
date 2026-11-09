import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), 'src/css/help', file), 'utf8');

const helpCss = read('HelpView.css');
const indexCss = read('HelpIndex.css');
const habboWayCss = read('HabboWay.css');

describe('help windows text (main2, report, sanction_info, my_reports, habbo_way)', () => {
    it('draws every help window in regular Ubuntu, not the condensed `Ubuntu` face', () => {
        expect(helpCss).toMatch(/\.octane-help :where\(\*\):not\(svg, svg \*\)[^{]*\{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(helpCss).toMatch(/\.octane-change-username :where\(\*\):not\(svg, svg \*\)/);
        expect(habboWayCss).toMatch(/\.octane-habboway :where\(\*\):not\(svg, svg \*\)[^{]*\{[^}]*HabboAirUbuntu/);
        expect(indexCss).not.toMatch(/font-family: Ubuntu, sans-serif/);
    });

    it('sizes the help page as the Illumina main2 layout', () => {
        expect(indexCss).toMatch(/\.octane-help-index \{[^}]*font-size: 11px/);
        expect(indexCss).toMatch(/\.octane-help-index__section-title \{[^}]*font-size: 10px/);
        expect(indexCss).toMatch(/\.octane-help-index__heading \{[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(indexCss).toMatch(/\.octane-help-index \.octane-help-index__button \{[^}]*font-size: 10px/);
        expect(indexCss).toMatch(/\.octane-help-index__link\.is-plain \{[^}]*font-size: 11px/);
    });

    it('sizes the report steps, the sanction status and the abusive notice as AIR', () => {
        expect(helpCss).toMatch(/\.octane-help-report \.fs-4 \{[^}]*font-size: 16px;[^}]*font-weight: 700/);
        expect(helpCss).toMatch(
            /\.octane-help-report :where\(\.habbo-btn-primary, \.habbo-btn-secondary, \.habbo-btn-danger\) \{[^}]*font-size: 16px !important/
        );
        expect(helpCss).toMatch(/\.octane-help-user__name \{[^}]*font-size: 10px/);
        expect(helpCss).toMatch(/\.octane-help-selected-user__text > b \{[^}]*font-size: 18px/);
        expect(helpCss).toMatch(/\.octane-sanction-info__body \{[^}]*font-size: 14px/);
        expect(helpCss).toMatch(/\.octane-abusive-alert__text \{[^}]*font-size: 11px/);
    });

    it('sizes the Habbo Way and its quiz as the Illumina layouts', () => {
        expect(habboWayCss).toMatch(
            /\.octane-habboway \.octane-air-modal__content,\s*\.octane-habboway-quiz \.octane-air-modal__content \{[^}]*font-size: 11px/
        );
        expect(habboWayCss).toMatch(/\.octane-habboway :is\(\.octane-habboway__nav, \.octane-habboway__action\)[^{]*\{[^}]*font-size: 10px/);
        expect(habboWayCss).toMatch(/\.octane-habboway-quiz__wait \{[^}]*font-size: 9px/);
    });

    it('skins the name change buttons grey and the report submit red as AIR', () => {
        const summary = readFileSync(join(process.cwd(), 'src/components/help/views/ReportSummaryView.tsx'), 'utf8');

        expect(helpCss).toMatch(
            /\.octane-change-username \.octane-card-content-shell \.habbo-btn-secondary \{[^}]*var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important/
        );
        expect(summary).toContain('variant="danger"');
        for (const file of ['NameChangeInitView', 'NameChangeInputView', 'NameChangeConfirmationView']) {
            expect(readFileSync(join(process.cwd(), `src/components/help/views/name-change/${file}.tsx`), 'utf8')).not.toMatch(/btn-(success|danger|primary)/);
        }
    });

    it('skins the report back, appeal and guardian close buttons as AIR, not with the flat picture', () => {
        expect(helpCss).toMatch(
            /:is\(\.octane-help-report, \.octane-my-reports\) \.habbo-btn-secondary \{[^}]*var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important/
        );
        expect(helpCss).toMatch(
            /:is\(\.octane-guardian-feedback, \.octane-guardian-pending\) \.octane-card-content-shell \.habbo-btn-secondary \{[^}]*var\(--habbo-skin-shiny-large\) !important;[^}]*font-size: 10px !important/
        );
    });

    it('draws the report step buttons on the large shiny skin tinted as AIR, white captions', () => {
        expect(helpCss).toMatch(
            /\.octane-help-report :is\(\.habbo-btn-primary, \.habbo-btn-secondary, \.habbo-btn-danger\) \{[^}]*min-height: 41px !important;[^}]*border-width: 6px 6px 7px !important;[^}]*border-image-slice: 6 6 7 6 fill !important;[^}]*color: #ffffff !important/
        );
        for (const [cls, tint] of [
            ['primary', '00aa00'],
            ['secondary', 'aaaaaa'],
            ['danger', 'aa0000']
        ]) {
            expect(helpCss).toContain(
                `.octane-help-report .habbo-btn-${cls} {\n        border-image-source: var(--habbo-skin-shiny-large-tint-${tint}) !important;`
            );
            expect(helpCss).toContain(
                `.octane-help-report .habbo-btn-${cls}:hover {\n        border-image-source: var(--habbo-skin-shiny-large-tint-${tint}-hover) !important;`
            );
            expect(helpCss).toContain(
                `.octane-help-report .habbo-btn-${cls}:is(:active, .active) {\n        border-image-source: var(--habbo-skin-shiny-large-tint-${tint}-pressed) !important;`
            );
        }
    });

    it('tints the sanction ok_button 0x009900 as AIR', () => {
        expect(helpCss).toMatch(
            /\.octane-sanction-info \.habbo-btn-green \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-009900\) !important;\s*color: #ffffff !important;/
        );
        expect(helpCss).toMatch(/\.octane-sanction-info \.habbo-btn-green:hover \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-009900-hover\)/);
    });
});
