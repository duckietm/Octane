import { parseCssTextColor } from './CssNativeText';
import { NativeFontStyle } from './NativeFont';

/** The computed CSS a label is drawn from (a CSSStyleDeclaration fits). */
export interface CssFontSource {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    fontStyle: string;
    color: string;
    letterSpacing: string;
    textTransform: string;
    textDecorationLine?: string;
    whiteSpace: string;
}

export interface CssNativeFont {
    style: NativeFontStyle;
    /** Upper or lower case asked by `text-transform`, applied to the text before drawing. */
    transform: 'uppercase' | 'lowercase' | null;
    /** False for `nowrap` / `pre`: the label is one line whatever its width. */
    wrap: boolean;
}

// AIR's u_* styles (styles.css): kerning on, advanced anti-aliasing, sharpness 80, thickness -15.
const UBUNTU_AIR = { kerning: true, antiAliasType: 'advanced', sharpness: 80, thickness: -15 } as const;

// Every Ubuntu face of the client becomes AIR's Ubuntu, the condensed `Ubuntu` / `UbuntuCondensed` ones included: AIR sets its
// windows in u_regular / u_bold, the regular cut.
const FAMILIES: [RegExp, NativeFontStyle['family']][] = [
    [/^volter/i, 'Volter'],
    [/ubuntu/i, 'Ubuntu']
];

const firstFamily = (value: string) =>
    (value ?? '')
        .split(',')[0]
        .trim()
        .replace(/^["']|["']$/g, '');

/**
 * The AIR text style for a label's computed CSS, or null when the label has to stay browser text: a face we have no glyphs for,
 * a transparent colour, letter spacing, an odd size, or italic or underlined Volter.
 */
export const resolveCssNativeFont = (css: CssFontSource): CssNativeFont | null => {
    if (!css) return null;

    const name = firstFamily(css.fontFamily);
    const family = FAMILIES.find(([pattern]) => pattern.test(name))?.[1];
    const size = Math.round(parseFloat(css.fontSize));
    const color = parseCssTextColor(css.color);
    const bold = css.fontWeight === 'bold' || css.fontWeight === 'bolder' || (parseInt(css.fontWeight, 10) || 400) >= 600;
    const italic = css.fontStyle === 'italic' || css.fontStyle?.startsWith('oblique');
    const spacing = css.letterSpacing === 'normal' ? 0 : parseFloat(css.letterSpacing) || 0;

    if (!family || color === null || spacing !== 0 || !Number.isFinite(size) || size < 7 || size > 40) return null;
    // The renderer has no italic Volter glyphs and draws underlines (Habbo skin effects) for ADVANCED (Ubuntu) text only.
    if (family === 'Volter' && (italic || css.textDecorationLine?.includes('underline'))) return null;

    const style: NativeFontStyle =
        family === 'Volter'
            ? { family, size, bold, italic: false, color, antiAliasType: 'normal', kerning: true, sharpness: 0, thickness: 0 }
            : { family, size, bold, italic, color, ...UBUNTU_AIR };

    if (css.textDecorationLine?.includes('underline')) style.underline = true;

    const transform = css.textTransform === 'uppercase' || css.textTransform === 'lowercase' ? css.textTransform : null;
    const wrap = css.whiteSpace !== 'nowrap' && css.whiteSpace !== 'pre';

    return { style, transform, wrap };
};

export const sameCssNativeFont = (a: CssNativeFont | null, b: CssNativeFont | null) =>
    a === b || (!!a && !!b && a.transform === b.transform && a.wrap === b.wrap && JSON.stringify(a.style) === JSON.stringify(b.style));
