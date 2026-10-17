import { FC } from 'react';
import { BaseButton } from '../BaseButton';

interface LayoutColorSwatchViewProps
{
    color: string;
    active?: boolean;
    title?: string;
    onClick?: () => void;
}

export const LayoutColorSwatchView: FC<LayoutColorSwatchViewProps> = ({ color, active = false, title = undefined, onClick = undefined }) =>
{
    return (
        <BaseButton
            aria-pressed={active}
            className={`octane-color-swatch${ active ? ' is-active' : '' }`}
            style={{ backgroundColor: color }}
            title={title}
            type="button"
            onClick={onClick}
        />
    );
};
