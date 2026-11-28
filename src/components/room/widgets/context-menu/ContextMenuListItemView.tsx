import { FC, MouseEvent, ReactNode, useMemo } from 'react';
import { Flex, FlexProps } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { HandheldDrawerAction, HandheldDrawerTone, useHandheldDrawer } from '../../../../common/handheld/HandheldInfoDrawer';

interface ContextMenuListItemViewProps extends FlexProps {
    disabled?: boolean;
    /** Phone drawer only: the picture over the label. The desktop bubble ignores it. */
    icon?: ReactNode;
    /** Phone drawer only: `danger` for what takes something away (pick up, kick, ban). The desktop bubble ignores it. */
    tone?: HandheldDrawerTone;
}

export const ContextMenuListItemView: FC<ContextMenuListItemViewProps> = (props) => {
    const { disabled = false, icon = null, tone, fullWidth = true, justifyContent = 'center', alignItems = 'center', classNames = [], onClick = null, ...rest } = props;

    const drawer = useHandheldDrawer();

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        if (disabled) return;

        if (onClick) onClick(event);
    };

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [
            'octane-context-menu-item',
            'cursor-pointer'
        ];

        if (disabled) newClassNames.push('disabled');

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [disabled, classNames]);

    if (drawer) {
        return (
            <HandheldDrawerAction className={classNames.join(' ')} disabled={disabled} icon={icon} title={rest.title} tone={tone} onClick={(event) => onClick?.(event as unknown as MouseEvent<HTMLDivElement>)}>
                {rest.children}
            </HandheldDrawerAction>
        );
    }

    return <Flex component={BaseButton} type="button" aria-disabled={disabled || undefined} alignItems={alignItems} classNames={getClassNames} fullWidth={fullWidth} justifyContent={justifyContent} onClick={handleClick} {...rest} />;
};
