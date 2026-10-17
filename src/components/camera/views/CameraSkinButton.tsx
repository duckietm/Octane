import { FC } from 'react';
import { CameraCenteredText } from './CameraNativeText';

interface CameraSkinButtonProps {
    label: string;
    variant: 'green' | 'gray' | 'gray-dark' | 'thick-green';
    disabled?: boolean;
    /** Window width the label is centred in. */
    labelWidth?: number;
    className?: string;
    onClick: () => void;
}

/** 110x27 (or 150x28) shiny window button: the skin comes from the .octane-camera-button rules. */
export const CameraSkinButton: FC<CameraSkinButtonProps> = ({ label, variant, disabled = false, labelWidth = 112, className = '', onClick }) => {
    // The green skins carry white labels, the gray ones black.
    const light = variant === 'green' || variant === 'thick-green';

    return (
        <button className={`octane-camera-button is-${variant} ${className}`} disabled={disabled} type="button" onClick={onClick}>
            <span className="octane-camera-button-label">
                <CameraCenteredText
                    color={light ? 0xffffff : 0x000000}
                    style={{ opacity: disabled ? 0.5 : 1 }}
                    text={label}
                    textStyle={variant === 'thick-green' ? 'button_shiny_bold' : 'button_shiny_regular'}
                    width={labelWidth}
                />
            </span>
        </button>
    );
};
