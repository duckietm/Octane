import { describe, expect, it } from 'vitest';
import { CssFontSource, resolveCssNativeFont } from './resolveCssNativeFont';

const css = (overrides: Partial<CssFontSource> = {}): CssFontSource => ({
    fontFamily: 'HabboAirUbuntu, UbuntuRegular, sans-serif',
    fontSize: '12px',
    fontWeight: '400',
    fontStyle: 'normal',
    color: 'rgb(0, 0, 0)',
    letterSpacing: 'normal',
    textTransform: 'none',
    textDecorationLine: 'none',
    whiteSpace: 'normal',
    ...overrides
});

describe('resolveCssNativeFont', () => {
    it('maps the regular Ubuntu faces to AIR u_* text', () => {
        expect(resolveCssNativeFont(css({ fontWeight: '700', color: 'rgb(102, 102, 102)' }))).toEqual({
            style: {
                family: 'Ubuntu',
                size: 12,
                bold: true,
                italic: false,
                color: 0x666666,
                kerning: true,
                antiAliasType: 'advanced',
                sharpness: 80,
                thickness: -15
            },
            transform: null,
            wrap: true
        });
        expect(resolveCssNativeFont(css({ fontFamily: '"AirAvatarMenuUbuntu"', fontStyle: 'italic' }))?.style).toMatchObject({
            family: 'Ubuntu',
            italic: true
        });
    });

    it('draws the condensed faces as AIR Ubuntu and keeps Volter', () => {
        expect(resolveCssNativeFont(css({ fontFamily: 'Ubuntu, sans-serif', fontSize: '11px' }))?.style).toMatchObject({ family: 'Ubuntu', size: 11 });
        expect(resolveCssNativeFont(css({ fontFamily: 'UbuntuCondensed', fontWeight: '700' }))?.style).toMatchObject({ family: 'Ubuntu', bold: true });
        expect(resolveCssNativeFont(css({ fontFamily: 'Volter', fontSize: '9px', fontWeight: 'bold' }))?.style).toMatchObject({
            family: 'Volter',
            bold: true,
            antiAliasType: 'normal'
        });
    });

    it('rounds sizes and carries case, underline and nowrap', () => {
        const font = resolveCssNativeFont(css({ fontSize: '12.6px', textTransform: 'uppercase', textDecorationLine: 'underline', whiteSpace: 'nowrap' }));

        expect(font?.style).toMatchObject({ size: 13, underline: true });
        expect(font?.transform).toBe('uppercase');
        expect(font?.wrap).toBe(false);
    });

    it('leaves to the browser what the native fonts cannot draw', () => {
        expect(resolveCssNativeFont(css({ fontFamily: 'Arial' }))).toBeNull();
        expect(resolveCssNativeFont(css({ color: 'rgba(0, 0, 0, 0)' }))).toBeNull();
        expect(resolveCssNativeFont(css({ letterSpacing: '1px' }))).toBeNull();
        expect(resolveCssNativeFont(css({ fontSize: '64px' }))).toBeNull();
        expect(resolveCssNativeFont(css({ fontFamily: 'Volter', fontStyle: 'italic' }))).toBeNull();
        expect(resolveCssNativeFont(css({ fontFamily: 'Volter', textDecorationLine: 'underline' }))).toBeNull();
    });
});
