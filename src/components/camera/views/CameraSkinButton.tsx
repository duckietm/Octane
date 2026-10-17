import { FC } from 'react';
import { CameraCenteredText } from './CameraNativeText';
import { BaseButton } from '../../../common/BaseButton';

interface CameraSkinButtonProps {
    label: string;
    variant: 'green' | 'gray' | 'gray-dark' | 'thick-green';
    disabled?: boolean;
    /** Window width the label is centred in. */
    labelWidth?: number;
    className?: string;
    onClick: () => void;
}

// 110x27 (or 150x28) shiny window button: skin from the .octane-camera-button rules, label drawn as a v75 TextField over it.
export const CameraSkinButton: FC<CameraSkinButtonProps> = ({ label, variant, disabled = false, labelWidth = 112, className = '', onClick }) => {
    // The green skins carry white labels, the gray ones black.
    const light = variant === 'green' || variant === 'thick-green';

    return (
        <BaseButton className={`octane-camera-button is-${variant} ${className}`} disabled={disabled} type="button" onClick={onClick}>
            <span className="octane-camera-button-label">
                <CameraCenteredText
                    background={light ? 0x000000 : 0xffffff}
                    color={light ? 0xffffff : 0x000000}
                    style={{ mixBlendMode: light ? 'screen' : 'multiply', opacity: disabled ? 0.5 : 1 }}
                    text={label}
                    textStyle={variant === 'thick-green' ? 'button_shiny_bold' : 'button_shiny_regular'}
                    width={labelWidth}
                />
            </span>
        </BaseButton>
    );
};
