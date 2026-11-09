import { FC, MouseEvent, useMemo } from 'react';
import { Flex, FlexProps } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';

interface ContextMenuListItemViewProps extends FlexProps {
    disabled?: boolean;
}

export const ContextMenuListItemView: FC<ContextMenuListItemViewProps> = (props) => {
    const { disabled = false, fullWidth = true, justifyContent = 'center', alignItems = 'center', classNames = [], onClick = null, ...rest } = props;

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

    return <Flex component={BaseButton} type="button" aria-disabled={disabled || undefined} alignItems={alignItems} classNames={getClassNames} fullWidth={fullWidth} justifyContent={justifyContent} onClick={handleClick} {...rest} />;
};
