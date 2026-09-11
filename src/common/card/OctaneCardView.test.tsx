import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CARD_FRAME_STYLE, OctaneCardView } from './OctaneCardView';

const shell = () => document.querySelector('.octane-card-shell') as HTMLElement;

describe('OctaneCardView default chrome', () => {
    afterEach(cleanup);

    it('uses the official frame 3 and the 17px classic scrollbar unless told otherwise', () => {
        render(
            <OctaneCardView uniqueKey="chrome-default">
                <div>content</div>
            </OctaneCardView>
        );

        expect(DEFAULT_CARD_FRAME_STYLE).toBe(3);
        expect(shell().classList.contains('octane-card-frame-3')).toBe(true);
        expect(shell().classList.contains('has-classic-scrollbar')).toBe(true);
        expect(shell().classList.contains('octane-scrollbar-native')).toBe(false);
    });

    it('drops the frame chrome for frameStyle 0 or null, which is the plain 31px title bar', () => {
        const { rerender } = render(
            <OctaneCardView uniqueKey="chrome-plain" frameStyle={0}>
                <div>content</div>
            </OctaneCardView>
        );

        expect([...shell().classList].some((name) => name.startsWith('octane-card-frame-'))).toBe(false);

        rerender(
            <OctaneCardView uniqueKey="chrome-plain" frameStyle={null}>
                <div>content</div>
            </OctaneCardView>
        );

        expect([...shell().classList].some((name) => name.startsWith('octane-card-frame-'))).toBe(false);
    });

    it('keeps every explicit frame style working', () => {
        const { rerender } = render(
            <OctaneCardView uniqueKey="chrome-explicit" frameStyle={3}>
                <div>content</div>
            </OctaneCardView>
        );

        expect(shell().classList.contains('octane-card-frame-3')).toBe(true);

        rerender(
            <OctaneCardView uniqueKey="chrome-explicit" frameStyle={5}>
                <div>content</div>
            </OctaneCardView>
        );

        expect(shell().classList.contains('octane-card-frame-5')).toBe(true);
        expect(shell().classList.contains('octane-card-frame-3')).toBe(false);
    });

    it('switches to the slim native scrollbar with classicScrollbar false', () => {
        render(
            <OctaneCardView uniqueKey="chrome-native" classicScrollbar={false}>
                <div>content</div>
            </OctaneCardView>
        );

        expect(shell().classList.contains('octane-scrollbar-native')).toBe(true);
        expect(shell().classList.contains('has-classic-scrollbar')).toBe(false);
    });
});

describe('OctaneCardView stylesheet', () => {
    const cardCss = readFileSync(join(process.cwd(), 'src/css/octanecard/OctaneCardView.css'), 'utf8');
    const scrollbarCss = readFileSync(join(process.cwd(), 'src/css/common/ClassicScrollbar.css'), 'utf8');

    it('cuts frame 3 as habbo_skin_frame_3: 33px top, 10px sides and bottom', () => {
        expect(cardCss).toMatch(/\.octane-card-shell\.octane-card-frame-3::before\s*\{[^}]*border-width:\s*33px 10px 10px/);
        expect(cardCss).toMatch(/border-image-slice:\s*33 10 10 10 fill/);
    });

    it('starts default content on the official x=3/y=36 plane with a rule any window can override', () => {
        // :where() keeps the specificity at zero so the windows that position
        // their content absolutely are not pushed down a second time.
        expect(cardCss).toMatch(/:where\(\.octane-card-shell\.octane-card-frame-3\)\s*\{[^}]*padding:\s*35px 2px 2px/);
    });

    it('keeps the plain 31px #347d93 title bar reachable for frameStyle 0', () => {
        const header = cardCss.match(/\.octane-card-header,\s*\.octane-card-header-shell\s*\{([^}]+)\}/)?.[1] ?? '';

        expect(header).toContain('min-height: 31px');
        expect(header).toContain('background: #347d93');
    });

    it('sets window titles in Ubuntu bold 12 like u_frame_title, never the condensed cut', () => {
        const titleRules = [...cardCss.matchAll(/\.octane-card-title\s*\{([^}]+)\}/g)].map((match) => match[1]);
        // The mobile media query only restates the size, so the family check
        // applies to the rules that actually pick a font.
        const familyRules = titleRules.filter((rule) => rule.includes('font-family'));

        expect(familyRules.length).toBeGreaterThan(0);
        expect(cardCss).not.toContain('UbuntuCondensed');

        for (const rule of familyRules) {
            expect(rule).toMatch(/font-family:\s*Ubuntu\b/);
            expect(rule).toMatch(/font-weight:\s*700/);
        }

        for (const rule of titleRules) expect(rule).toMatch(/font-size:\s*12px/);
    });

    it('lets classicScrollbar false override the global 17px theme with the thin native bar', () => {
        const override = scrollbarCss.match(/\.has-classic-scrollbar \.octane-scrollbar-native \*\s*\{([^}]+)\}/)?.[1] ?? '';

        expect(override).toContain('scrollbar-width: thin');
    });
});
