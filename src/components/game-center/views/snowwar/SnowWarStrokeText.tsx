import { CSSProperties, FC } from 'react';

/**
 * AIR stroked text: every outlined SnowWar caption is two text windows, a
 * `_stroke` copy in UbuntuThick in the outline colour (WindowUtils.colorStrokes
 * recolours it per team) with the white Ubuntu Bold caption on top. The two
 * fonts share their advance widths, so the layers line up glyph for glyph.
 */
export const SnowWarStrokeText: FC<{ text: string | number; stroke?: string; className?: string }> = ({ text, stroke = '#1077ac', className = '' }) =>
{
    const value = String(text);

    return (
        <span className={ `snowwar-stroke ${ className }`.trim() } data-text={ value } style={ { '--snowwar-stroke': stroke } as CSSProperties }>
            { value }
        </span>
    );
};
