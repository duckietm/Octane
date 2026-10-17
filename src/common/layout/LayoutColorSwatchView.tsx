import { FC } from 'react';
import { BaseButton } from '../BaseButton';
import { ToggleButton } from '../ToggleButton';
import { Hint } from '../Tooltip';

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
        <Hint content={title}>
            <ToggleButton aria-label={title} pressed={active}
                className={`octane-color-swatch${ active ? ' is-active' : '' }`}
                style={{ backgroundColor: color }}
                type="button"
                onClick={onClick}
            />
        </Hint>
    );
};
