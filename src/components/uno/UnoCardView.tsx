import { FC } from 'react';
import { UnoCardCode, unoCardName } from '../../api';
import sheet from '../../assets/images/uno/uno-cards.png';

/**
 * A card in Habbi's pixel art (uno-cards.png, drawn by deploy/scripts/uno-cards.py): 24x36 pixels, shown at a whole
 * zoom. The sheet holds, in one row: 0-9, skip, reverse, +2 for red, yellow, green and blue, then wild, +4 and the back.
 */
export const UNO_CARD_WIDTH = 24;
export const UNO_CARD_HEIGHT = 36;
const SHEET_WIDTH = 55 * UNO_CARD_WIDTH;
const VALUES = '0123456789SRD';

export const unoCardIndex = (code: UnoCardCode): number => {
    if (!code) return 54;
    if (code.startsWith('WF')) return 53;
    if (code.startsWith('W')) return 52;

    const colour = 'RYGB'.indexOf(code.charAt(0));
    const value = VALUES.indexOf(code.charAt(1));

    return colour < 0 || value < 0 ? 54 : colour * 13 + value;
};

export const UnoCardView: FC<{
    code?: UnoCardCode;
    back?: boolean;
    zoom?: number;
    playable?: boolean;
    dimmed?: boolean;
    className?: string;
    onClick?: () => void;
}> = ({ code = '', back = false, zoom = 2, playable = false, dimmed = false, className = '', onClick = null }) => {
    const index = back ? 54 : unoCardIndex(code);
    const style = {
        width: UNO_CARD_WIDTH * zoom,
        height: UNO_CARD_HEIGHT * zoom,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${SHEET_WIDTH * zoom}px ${UNO_CARD_HEIGHT * zoom}px`,
        backgroundPosition: `${-index * UNO_CARD_WIDTH * zoom}px 0`
    };
    const classes = `uno-card ${playable ? 'is-playable' : ''} ${dimmed ? 'is-dimmed' : ''} ${className}`;

    if (onClick) return <button type="button" className={classes} style={style} onClick={onClick} aria-label={back ? '' : unoCardName(code)} />;

    return <span className={classes} style={style} aria-hidden="true" />;
};
