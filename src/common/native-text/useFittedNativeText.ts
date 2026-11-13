import { useEffect, useMemo, useState } from 'react';
import { fitNativeText } from './fitNativeText';
import { loadNativeFont, measureNativeText, peekNativeFont } from './NativeFont';
import { nativeTextStyles } from './NativeTextStyles';

/**
 * `text` shortened with "..." so that its raster in `textStyle` is at most `width` pixels wide (the TextField's
 * 2 px gutter on each side included). For a label of a native layout whose box cannot grow: its caption is drawn
 * as wide as it is, so a long one has to be cut before it is handed over. Until the font is there the text comes
 * back as it is.
 */
export const useFittedNativeText = (text: string, textStyle: keyof typeof nativeTextStyles, width: number): string => {
    const style = nativeTextStyles[textStyle];
    const [font, setFont] = useState(() => peekNativeFont(style));

    useEffect(() => {
        if (font) return;

        let alive = true;

        loadNativeFont(style)
            .then((loaded) => alive && setFont(loaded))
            .catch(() => undefined);

        return () => {
            alive = false;
        };
    }, [font, style]);

    return useMemo(() => (font ? fitNativeText(text, Math.max(0, width - 4), (part) => measureNativeText(font.font, part, style)) : text), [font, style, text, width]);
};
