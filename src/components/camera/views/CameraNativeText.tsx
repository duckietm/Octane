import { CSSProperties, FC, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';

export const CAMERA_PANEL_COLOR = 0xe9e9e1;
export const CAMERA_BOX_COLOR = 0xc7c6bf;
export const CAMERA_COMPETITION_COLOR = 0x4d1725;

interface CameraNativeTextProps {
    text: string;
    textStyle?: NativeTextStyleName;
    background?: number;
    maxWidth?: number;
    color?: number;
    size?: number;
    underline?: boolean;
    className?: string;
    style?: CSSProperties;
}

// v75 TextField raster (HabboWindowManagerCom text_styles_css), drawn over the flat colour of the window part it sits on.
export const CameraNativeText: FC<CameraNativeTextProps> = ({
    text,
    textStyle = 'u_regular',
    background = CAMERA_PANEL_COLOR,
    maxWidth,
    color,
    size,
    underline,
    className,
    style
}) => {
    const overrides = {
        ...(color === undefined ? {} : { color }),
        ...(size === undefined ? {} : { size }),
        ...(underline === undefined ? {} : { underline })
    };

    return <NativeText className={className} text={text.replace(/<br\s*\/?>/gi, '\n')} textStyle={textStyle} background={background} maxWidth={maxWidth} overrides={overrides} style={style} />;
};

// auto_size="center": the TextField is placed at floor((width - fieldWidth) / 2) inside its window, never on a half pixel.
export const CameraCenteredText: FC<CameraNativeTextProps & { width: number }> = ({ width, ...props }) => {
    const fieldRef = useRef<HTMLSpanElement>(null);
    const [left, setLeft] = useState(0);

    useLayoutEffect(() => {
        const field = fieldRef.current;

        if (!field) return;

        const place = () => setLeft(Math.floor((width - field.offsetWidth) / 2));
        const observer = new ResizeObserver(place);

        place();
        observer.observe(field);

        return () => observer.disconnect();
    }, [width]);

    return (
        <span ref={fieldRef} style={{ display: 'inline-block', position: 'relative', left }}>
            <CameraNativeText {...props} />
        </span>
    );
};
