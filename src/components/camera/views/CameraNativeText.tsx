import { CSSProperties, FC } from 'react';

export const CAMERA_PANEL_COLOR = 0xe9e9e1;
export const CAMERA_BOX_COLOR = 0xc7c6bf;
export const CAMERA_COMPETITION_COLOR = 0x4d1725;

export type CameraTextStyle = 'u_regular' | 'u_bold' | 'u_frame_title' | 'u_button_tab' | 'button_shiny_regular' | 'button_shiny_bold';

interface CameraNativeTextProps {
    text: string;
    textStyle?: CameraTextStyle;
    maxWidth?: number;
    color?: number;
    size?: number;
    underline?: boolean;
    className?: string;
    style?: CSSProperties;
}

const toCssColor = (color: number) => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;

/** The text of a v75 camera window part, in the hotel font with the official style's weight, size and colour. */
export const CameraNativeText: FC<CameraNativeTextProps> = ({ text, textStyle = 'u_regular', maxWidth, color, size, underline, className = '', style }) => (
    <span
        className={`octane-camera-text is-${textStyle.replace(/_/g, '-')} ${className}`.trim()}
        style={{
            ...(maxWidth === undefined ? {} : { maxWidth }),
            ...(color === undefined ? {} : { color: toCssColor(color) }),
            ...(size === undefined ? {} : { fontSize: size }),
            ...(underline ? { textDecoration: 'underline' } : {}),
            ...style
        }}
    >
        {(text ?? '').split(/<br\s*\/?>/i).flatMap((line, index) => (index ? [<br key={index} />, line] : [line]))}
    </span>
);

/** auto_size="center": the text is centred in a window {@link width} pixels wide. */
export const CameraCenteredText: FC<CameraNativeTextProps & { width: number }> = ({ width, style, ...props }) => (
    <span className="octane-camera-text-centered" style={{ width }}>
        <CameraNativeText {...props} style={style} />
    </span>
);
