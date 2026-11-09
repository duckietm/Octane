import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/room/FurniWindowsBAir.css');
const pollCss = read('src/css/room/Poll.css');
const rentCss = read('src/css/room/RentableSpaceWidget.css');

describe('furni windows text (AIR room-ui layouts)', () => {
    it('sets the Ubuntu windows in regular Ubuntu, also over the shared condensed card text', () => {
        for (const root of ['rent-confirm', 'petpackage', 'gift-opening', 'mysterybox', 'mysterytrophy', 'lock-confirm', 'highscore']) {
            expect(css).toContain(`.octane-furni-${root} :where(*):not(svg, svg *)`);
        }

        expect(css).toMatch(/@layer base \{[^@]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(css).toMatch(/\.octane-furni-lovelock\.octane-engraving-lock-view \{[^}]*HabboAirUbuntu[^}]*font-size: 12px;[^}]*font-weight: 700/);
    });

    it('draws the style 0 windows in Volter 9 px', () => {
        expect(css).toMatch(/\.octane-furni-exchange-credit \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\),\s*\.octane-furni-ecotronbox\.octane-ecotronbox-card :where\(\*\):not\(svg, svg \*\) \{[^}]*Volter[^}]*font-size: 9px !important/);
    });

    it('sizes buttons in the base layer so the shared Button size loses', () => {
        expect(css).toMatch(/\.octane-furni-mysterytrophy :where\(button\) \{\s*font-size: 12px !important/);
        expect(css).toMatch(/\.octane-furni-lock-confirm :where\(button\) \{\s*font-size: 10px !important;\s*font-weight: 700 !important/);
        expect(rentCss).toMatch(/\.octane-widget-rentablespace :where\(button\) \{\s*font-size: 12px !important/);
        expect(rentCss).toMatch(/\.rentablespace-rent-button :where\(span\) \{\s*font-size: 16px !important/);
    });

    it('keeps the AIR text styles per element', () => {
        expect(css).toMatch(/\.is-result \.wordquiz-question__topic \{\s*font-size: 24px/);
        expect(css).toMatch(/\.wordquiz-question__topic \{[^}]*font-size: 28px/);
        expect(css).toMatch(/\.wordquiz-question__count \{[^}]*font-size: 14px;\s*font-weight: 700/);
        expect(css).toMatch(/\.package-text-big \{\s*font-size: 24px;\s*font-weight: 700/);
        expect(css).toMatch(/\.input-pet-package \{\s*font-size: 16px;\s*font-weight: 700/);
        expect(css).toMatch(/\.mysterytrophy-text-big \{\s*font-size: 24px;\s*font-weight: 700/);
        expect(css).toMatch(/\.octane-furni-mysterybox__subtitle \{\s*font-size: 12px;\s*font-weight: 700/);
        expect(css).toMatch(/\.octane-furni-lock-confirm__subtitle \{\s*font-size: 14px/);
        expect(css).toMatch(/\.octane-furni-highscore__caption \{\s*font-size: 12px;\s*font-weight: 700/);
        expect(css).toMatch(/\.octane-furni-highscore__entry \{\s*font-size: 11px;\s*font-weight: 400/);
        expect(rentCss).toMatch(/\.rentablespace-headline \{[^}]*font-size: 14px/);
    });

    it('sets the poll in regular Ubuntu with a regular question and 12 px links and button', () => {
        expect(pollCss).toContain('.octane-widget-poll.octane-poll :where(*):not(svg, svg *)');
        expect(pollCss).toMatch(/\.octane-poll-question \{\s*font-weight: 400/);
        expect(pollCss).not.toMatch(/font-family: Ubuntu, sans-serif/);
        expect(pollCss).toMatch(/\.octane-poll-ok \{[^}]*font-size: 12px;\s*font-weight: 700/);
    });

    it('draws rent_confirmation ok_button tinted 0x00cc00 and cancel_button grey, as AIR', () => {
        const view = read('src/components/room/widgets/rent/FurniRentConfirmView.tsx');
        expect(view).toContain('octane-furni-rent-confirm__ok');
        expect(view).toContain('octane-furni-rent-confirm__cancel');
        expect(css).toMatch(
            /\.octane-furni-rent-confirm \.octane-furni-rent-confirm__ok\.habbo-btn-primary \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-00cc00\) !important;\s*color: #ffffff !important;/
        );
        expect(css).toMatch(/\.octane-furni-rent-confirm__ok\.habbo-btn-primary:hover \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-00cc00-hover\)/);
        expect(css).toMatch(/\.octane-furni-rent-confirm__cancel\.habbo-btn-secondary \{\s*border-image-source: var\(--habbo-skin-shiny\) !important;\s*color: #000000 !important;/);
    });
});
