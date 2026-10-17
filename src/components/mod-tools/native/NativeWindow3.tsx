import { CSSProperties, FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import ubuntuAtlas from '../../../assets/mod-tools/skins/habbo-ubuntu-skin.png';
import blueAtlas from '../../../assets/mod-tools/skins/habbo-blue-skin.png';
import closeXml from '../../../assets/mod-tools/skins/skin-button_close_3.xml?raw';
import frameXml from '../../../assets/mod-tools/skins/skin-frame_3.xml?raw';
import thickXml from '../../../assets/mod-tools/skins/skin-button_shiny_thick.xml?raw';
import '../../../css/mod-tools/NativeWindow3.css';
import { parseNativeSkin } from './NativeSkin';
import { NativeSkinView } from './NativeSkinView';
import { BaseButton } from '../../../common/BaseButton';

// Window-manager style 3 (the Ubuntu skin): frame_3 coloured 0xff418db0, close button, shiny thick button, Ubuntu text styles.
const SKINS = { frame: parseNativeSkin(frameXml), close: parseNativeSkin(closeXml), thick: parseNativeSkin(thickXml) };

export const FRAME3_COLOR = 0x418db0;
/** The title bar of frame_3 after the frame colour multiplies the skin (the title text sits on it). */
export const FRAME3_TITLE_COLOR = 0x377998;

const rect = (x: number, y: number, width: number, height: number): CSSProperties => ({ left: x, top: y, width, height });

interface Native3FrameProps {
    width: number;
    height: number;
    title: string;
    onClose: () => void;
    children?: ReactNode;
}

/** Frame style 3: the 9-slice frame_3 skin, a 19x20 close button at (width - 29, 8) and the content area at the frame margins (6, 25). */
export const Native3Frame: FC<Native3FrameProps> = ({ width, height, title, onClose, children }) => {
    const [closeState, setCloseState] = useState<'default' | 'hovering' | 'pressed'>('default');

    return (
        <section aria-label={title} className="native3-frame" role="dialog" style={{ width, height }}>
            <NativeSkinView atlas={ubuntuAtlas} color={FRAME3_COLOR} height={height} layout="frame_3" skin={SKINS.frame} width={width} />
            <div className="native3-title" style={{ left: 0, top: 4, width, height: 27 }}>
                <NativeText background={FRAME3_TITLE_COLOR} overrides={{ color: 0xffffff }} text={title} textStyle="u_frame_title" />
            </div>
            <BaseButton
                aria-label="Close"
                className="native3-close"
                type="button"
                style={rect(width - 29, 8, 19, 20)}
                onClick={onClose}
                onPointerDown={() => setCloseState('pressed')}
                onPointerEnter={() => setCloseState('hovering')}
                onPointerLeave={() => setCloseState('default')}
                onPointerUp={() => setCloseState('hovering')}
            >
                <NativeSkinView atlas={ubuntuAtlas} height={20} layout="button_close_3" skin={SKINS.close} state={closeState} width={19} />
            </BaseButton>
            <div className="native3-client" style={{ left: 6, top: 25 }}>
                {children}
            </div>
        </section>
    );
};

// The label is set over the bands of the shiny face (rows inside the 24px button, per state), each band against its own colour.
const FACE_BANDS: Record<string, { from: number; to: number; color: number }[]> = {
    default: [{ from: 0, to: 4, color: 0xd9d9d9 }, { from: 4, to: 12, color: 0xf3f3f3 }, { from: 12, to: 24, color: 0xd9d9d9 }],
    hovering: [{ from: 0, to: 12, color: 0xffffff }, { from: 12, to: 24, color: 0xebebeb }],
    pressed: [{ from: 0, to: 4, color: 0xa3a3a3 }, { from: 4, to: 12, color: 0xe1e1e1 }, { from: 12, to: 24, color: 0xa3a3a3 }]
};

interface Native3ThickButtonProps {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    onClick?: () => void;
}

/** `button_thick` of style 3 (shiny thick): the label is Ubuntu bold, centred on whole pixels (measured against the native Ok button: 1px right, 3px down of the centred field). */
export const Native3ThickButton: FC<Native3ThickButtonProps> = ({ x, y, width, height, label, onClick }) => {
    const [over, setOver] = useState(false);
    const [down, setDown] = useState(false);
    const state = down ? 'pressed' : over ? 'hovering' : 'default';
    const labelRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({ left: 0, top: 0 });

    useLayoutEffect(() => {
        const element = labelRef.current;

        if (!element) return;

        const place = () => setOffset({ left: Math.floor((width - element.offsetWidth) / 2) + 1, top: Math.floor((height - element.offsetHeight) / 2) + 3 });

        place();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(place);

        observer.observe(element);

        return () => observer.disconnect();
    }, [label, width, height]);

    return (
        <BaseButton type="button"
            className="native3-box native3-button"
            style={rect(x, y, width, height)}
            onClick={onClick}
            onPointerDown={() => setDown(true)}
            onPointerEnter={() => setOver(true)}
            onPointerLeave={() => {
                setOver(false);
                setDown(false);
            }}
            onPointerUp={() => setDown(false)}
        >
            <NativeSkinView atlas={blueAtlas} height={height} layout="button_shiny_thick" skin={SKINS.thick} state={state} width={width} />
            <div ref={labelRef} className="native3-button__label" style={offset}>
                <NativeText background={FACE_BANDS[state][0].color} text={label} textStyle="u_bold" style={{ visibility: 'hidden' }} />
            </div>
            {FACE_BANDS[state].map((band) => (
                <div key={band.from} className="native3-button__band" style={{ top: band.from, height: band.to - band.from, width }}>
                    <div className="native3-button__label" style={{ left: offset.left, top: offset.top - band.from }}>
                        <NativeText background={band.color} text={label} textStyle="u_bold" />
                    </div>
                </div>
            ))}
        </BaseButton>
    );
};
